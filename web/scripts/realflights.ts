// The flight log oracle on real drone flights. Reads the converted public PX4 Flight Review
// logs in evidence/realflights/flights.json (multirotor, the longest AUTO_MISSION segment of
// each log, GPS resampled to 1 Hz, battery used and altitude variance over that segment) and:
// 1. runs every flight with an honest claim (the area the smoothed track covers at the engine's
//    default 3 m swath) through plausible(), the same call the engine makes, and reports the
//    false alarm rate with a Wilson interval and which feature raised each alarm;
// 2. injects the five tamper classes of ml/plausibility.ts, with the same parameter ranges,
//    into every real flight and reports detection;
// 3. shows what a recalibration on real data would give: robust z fitted on one third of the
//    flights, the conformal threshold on another third, and both rates on the last third only.
//    Nothing is tuned on the flights a rate is reported on.
// Writes docs/results/realflights.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { plausible } from "../src/engine/oracle";
import { BATTERY_PER_MU, FEATURES, MU_M2, SEED, TARGET_FALSE_ALARM, THRESHOLD, rng, robustZ, derive, MODEL, type Flight, type Model, type Tamper } from "../src/engine/ml/plausibility";
import { fuse, toTrack, type GpsTrack } from "../src/engine/fusion/kalman";
import { calibrate } from "../src/engine/fusion/conformal";
import { wilson, fmtInterval } from "../src/engine/stats";

interface Real { logId: string; url: string; missionSeconds: number; batteryUsedPct: number; altVar: number; gps: { t: number[]; x: number[]; y: number[] } }
const ROOT = join(__dirname, "..");
const src = JSON.parse(readFileSync(join(ROOT, "evidence/realflights/flights.json"), "utf8")) as { source: string; licence: string; selection: string; flights: Real[] };
const SWATH = 3;
const TAMPERS: Tamper[] = ["inflated_mu", "replayed_track", "impossible_speed", "battery_too_low", "teleport_jump"];

interface Case { id: string; samples: GpsTrack; claimedMu: number; batteryPct: number; altVar: number }
const rawLen = (s: GpsTrack) => { let d = 0; for (let i = 1; i < s.n; i++) d += Math.hypot(s.x[i] - s.x[i - 1], s.y[i] - s.y[i - 1]); return d; };
// The honest claim is what a flight app summing the GPS fixes would report: raw track length
// times the swath. The oracle measures the smoothed track, so the ratio carries real noise.
const cases: Case[] = src.flights.map((f) => {
  const samples = toTrack(f.gps.t.map((t, i) => ({ t, x: f.gps.x[i], y: f.gps.y[i] })));
  const claimedMu = Math.round(rawLen(samples) * SWATH / MU_M2 * 100) / 100;
  return { id: f.logId, samples, claimedMu, batteryPct: f.batteryUsedPct, altVar: f.altVar };
});
const n = cases.length;
const secs = (s: GpsTrack) => s.n ? s.t[s.n - 1] - s.t[0] : 0;
const engine = (c: Case, seen?: Set<string>) => plausible(c.id, rawLen(c.samples), secs(c.samples), SWATH, c.claimedMu, c.batteryPct, c.altVar, c.samples, seen);

// The tamper classes of ml/plausibility.ts, one of each per flight, same parameter ranges.
const between = (r: () => number, lo: number, hi: number) => lo + r() * (hi - lo);
function tamper(kind: Tamper, c: Case, i: number, r: () => number): Case {
  switch (kind) {
    case "inflated_mu": return { ...c, claimedMu: Math.round(c.claimedMu * between(r, 1.6, 3)) };
    case "replayed_track": { const s = cases[(i + 1 + Math.floor(r() * (n - 1))) % n]; return { ...s, id: c.id, batteryPct: Math.round(s.claimedMu * BATTERY_PER_MU * between(r, 0.9, 1.1) * 10) / 10 }; }
    case "impossible_speed": { const k = between(r, 0.1, 0.3); return { ...c, samples: { ...c.samples, t: c.samples.t.map((v) => v * k) } }; }
    case "battery_too_low": return { ...c, batteryPct: Math.round(c.batteryPct * between(r, 0.15, 0.45) * 10) / 10 };
    case "teleport_jump": {
      const S = c.samples, h = Math.floor(S.n / 2), m = 2 * h;
      const ang = between(r, 0, 2 * Math.PI), d = between(r, 150, 600), dx = Math.cos(ang) * d, dy = Math.sin(ang) * d;
      const dt = S.n > 1 ? S.t[1] - S.t[0] : 1;
      const t = new Float64Array(m), x = new Float64Array(m), y = new Float64Array(m);
      for (let j = 0; j < h; j++) { t[j] = S.t[j]; x[j] = S.x[j]; y[j] = S.y[j]; t[h + j] = S.t[h - 1] + (j + 1) * dt; x[h + j] = S.x[j] + dx; y[h + j] = S.y[j] + dy; }
      return { ...c, samples: { n: m, t, x, y } };
    }
  }
}
// The replay class needs a session that saw the source flight; the other classes keep the
// honest samples, so they are scored without a registry (otherwise the replay check alone
// would catch them).
const sessionOf = (kind: Tamper) => kind === "replayed_track" ? new Set(cases.map((c) => fuse(c.samples).key)) : undefined;

// 1. Honest real flights through the engine as it is. One session registry for all of them,
// so two distinct real flights colliding on the replay key would count as a false alarm.
const seen = new Set<string>();
const honestRuns = cases.map((c) => ({ c, t: engine(c, seen) }));
const fa = honestRuns.filter((h) => !h.t.ok);
const reasonCount: Record<string, number> = {};
for (const h of fa) for (const why of h.t.reasons) { const k = why.replace(/ z [+-]?[\d.]+$/, ""); reasonCount[k] = (reasonCount[k] ?? 0) + 1; }
const faCI = wilson(fa.length, n);

// 2. Tampered real flights through the engine as it is.
const r = rng(SEED);
const byTamper = Object.fromEntries(TAMPERS.map((k) => [k, { n: 0, caught: 0 }])) as Record<Tamper, { n: number; caught: number }>;
const tampered: { i: number; kind: Tamper; c: Case }[] = [];
cases.forEach((c, i) => { for (const kind of TAMPERS) tampered.push({ i, kind, c: tamper(kind, c, i, r) }); });
for (const t of tampered) { byTamper[t.kind].n++; if (!engine(t.c, sessionOf(t.kind)).ok) byTamper[t.kind].caught++; }
const caught = Object.values(byTamper).reduce((a, b) => a + b.caught, 0);
const detCI = wilson(caught, tampered.length);
const byTamperCI = Object.fromEntries(TAMPERS.map((k) => [k, wilson(byTamper[k].caught, byTamper[k].n)]));

// Feature medians on the real flights next to the synthetic model's, to show the mismatch.
const toFlight = (c: Case, s?: Set<string>): Flight => {
  const g = fuse(c.samples, { seen: s });
  return { trackM: Math.round(g.rawTrackM), seconds: Math.round(secs(c.samples)), swathM: SWATH, claimedMu: c.claimedMu, batteryPct: c.batteryPct, altVar: c.altVar, gps: { smoothedTrackM: g.smoothedTrackM, innovationRms: g.innovationRms, outliers: g.outliers.length, replayed: g.replayed, noiseM: g.noiseM } };
};
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN; };
function fit(rows: Record<string, number>[]): Model {
  const out = {} as Model;
  for (const f of FEATURES) {
    const xs = rows.map((row) => row[f]).filter((v) => Number.isFinite(v));
    const med = median(xs);
    // MAD floor of 1 percent of the median, fixed before looking at the test flights: real
    // 1 Hz GPS is already filtered by the receiver, so the honest area ratio is nearly constant
    // and an unfloored MAD makes any rounding a huge z.
    out[f] = { median: med, mad: Math.max(median(xs.map((x) => Math.abs(x - med))) * 1.4826, Math.abs(med) * 0.01, 1e-6) };
  }
  return out;
}
const realModel = fit(cases.map((c) => derive(toFlight(c))));

// 3. Recalibration with a three way split by a hash of the log id: fit, calibrate, test.
const bucket = (id: string) => { let h = 2166136261; for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h % 3; };
const fitSet = cases.filter((c) => bucket(c.id) === 0), calSet = cases.filter((c) => bucket(c.id) === 1);
const testIdx = cases.map((c, i) => i).filter((i) => bucket(cases[i].id) === 2);
const model = fit(fitSet.map((c) => derive(toFlight(c))));
// Two targets: the engine's 2 percent (with about 36 calibration flights its conformal rank is
// the largest score, so one odd calibration flight sets it) and 10 percent, the smallest target
// this calibration set can actually hold.
function recalibrate(alpha: number) {
  const conf = calibrate(calSet.map((c) => robustZ(toFlight(c), model).z), alpha);
  const ok = (c: Case, s?: Set<string>) => { const f = toFlight(c, s); return robustZ(f, model).z <= conf.threshold && !f.gps!.replayed && f.gps!.outliers === 0; };
  const drivers: Record<string, number> = {};
  for (const i of testIdx) { const { z, zs } = robustZ(toFlight(cases[i]), model); if (z > conf.threshold) for (const f of FEATURES) if (Math.abs(zs[f]) > conf.threshold) drivers[f] = (drivers[f] ?? 0) + 1; }
  const T = tampered.filter((t) => testIdx.includes(t.i));
  const by = Object.fromEntries(TAMPERS.map((k) => { const ts = T.filter((t) => t.kind === k); return [k, wilson(ts.filter((t) => !ok(t.c, sessionOf(k))).length, ts.length)]; }));
  const falseAlarm = wilson(testIdx.filter((i) => !ok(cases[i])).length, testIdx.length), detection = wilson(T.filter((t) => !ok(t.c, sessionOf(t.kind))).length, T.length);
  return { targetFalseAlarm: alpha, threshold: conf.threshold, calibrationN: conf.n, rank: conf.rank, falseAlarm, falseAlarmText: fmtInterval(falseAlarm), falseAlarmDrivers: drivers, detection, detectionText: fmtInterval(detection), byTamper: by };
}
const calZ = Object.fromEntries(FEATURES.map((f) => [f, Math.round(Math.max(...calSet.map((c) => Math.abs(robustZ(toFlight(c), model).zs[f])))*10)/10]));
const recal2 = recalibrate(TARGET_FALSE_ALARM), recal10 = recalibrate(0.1);
const engineOnTest = { falseAlarm: wilson(testIdx.filter((i) => !honestRuns[i].t.ok).length, testIdx.length) };

const r3 = (v: number) => Math.round(v * 1000) / 1000;
const out = {
  source: src.source, licence: src.licence, selection: src.selection,
  flights: n, swathM: SWATH,
  honestClaim: "claimed mu = raw GPS track length times the 3 m swath (the engine's default): what a flight app summing the fixes reports for the flight",
  engineAsIs: {
    threshold: THRESHOLD,
    falseAlarm: faCI, falseAlarmText: fmtInterval(faCI),
    falseAlarmReasons: reasonCount,
    detection: detCI, detectionText: fmtInterval(detCI), byTamper: byTamperCI,
  },
  featureMedians: Object.fromEntries(FEATURES.map((f) => [f, { real: r3(realModel[f].median), synthetic: r3(MODEL[f].median) }])),
  recalibrated: {
    method: `robust z (MAD floored at 1 percent of the median) fitted on ${fitSet.length} real flights, conformal threshold on ${calSet.length} others (targets 0.02 and 0.1), rates on the remaining ${testIdx.length} only; split by a hash of the log id`,
    maxAbsZOnCalibrationByFeature: calZ, model,
    atEngineTarget: recal2, atTenPercent: recal10,
    engineAsIsOnSameTestFlights: engineOnTest,
  },
  perFlight: honestRuns.map((h) => ({ logId: h.c.id, ok: h.t.ok, z: h.t.z, reasons: h.t.reasons, areaMu: h.t.areaMu, seconds: h.t.seconds })),
};
writeFileSync(join(ROOT, "../docs/results/realflights.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`real flights ${n} (${src.source})`);
console.log(`engine as is, z threshold ${THRESHOLD}: false alarm ${fmtInterval(faCI)}`);
console.log(`  alarms by reason: ${JSON.stringify(reasonCount)}`);
console.log(`  tamper detection ${fmtInterval(detCI)}`);
for (const k of TAMPERS) console.log(`    ${k}: ${fmtInterval(byTamperCI[k])}`);
console.log(`feature medians real vs synthetic: ${JSON.stringify(out.featureMedians)}`);
console.log(`calibration max |z| by feature ${JSON.stringify(calZ)}`);
console.log(`recalibrated: ${out.recalibrated.method}`);
for (const R of [recal2, recal10]) {
  console.log(`  target ${R.targetFalseAlarm}, threshold ${R.threshold}: false alarm ${R.falseAlarmText}, detection ${R.detectionText}`);
  for (const k of TAMPERS) console.log(`    ${k}: ${fmtInterval(R.byTamper[k])}`);
}
