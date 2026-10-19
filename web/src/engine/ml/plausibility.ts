// A telemetry anomaly model. 2000 synthetic flights are generated from physical rules with
// noise under a fixed seed; 15 percent are tampered. Each flight carries a GPS track sampled
// at 1 Hz with receiver noise, which the Kalman filter in fusion/kalman.ts turns into a
// smoothed track length, an innovation RMS and a replay key. A robust z-score (median and
// MAD) is fitted per derived feature on the first 750 flights, the next 750 calibrate the
// conformal threshold, the last 500 are held out and scored. A flight is flagged when its
// largest absolute robust z crosses the conformal threshold, when its track was seen before
// (replayed track) or when the filter rejected a jump the model cannot explain (teleport jump).

import { fuse, type GpsTrack } from "../fusion/kalman";
import { calibrate, exceedRate, type Conformal } from "../fusion/conformal";

export const SEED = 7331;
export const N = 2000;
export const TAMPER_SHARE = 0.15;
export const FIXED_THRESHOLD = 4; // the old hand set threshold, kept for the smoothing comparison
export const TARGET_FALSE_ALARM = 0.02;
export const MU_M2 = 666.7;
// Honest physics: battery percent used per mu sprayed (the payload and the hover dominate, not
// the track), altitude variance in square metres on a real spraying pass.
export const BATTERY_PER_MU = 0.55;
export const ALT_VAR = 0.25;

// What the filter kept of a flight's GPS track. Samples themselves are not stored.
export interface GpsSummary { smoothedTrackM: number; innovationRms: number; outliers: number; replayed: boolean; noiseM: number }
export interface Flight { trackM: number; seconds: number; swathM: number; claimedMu: number; batteryPct: number; altVar: number; gps?: GpsSummary }
export type Tamper = "inflated_mu" | "replayed_track" | "impossible_speed" | "battery_too_low" | "teleport_jump";
export interface Score { z: number; ok: boolean; reasons: string[]; zs: Record<FeatureName, number> }
export interface PlausibilityMetrics {
  n: number; tampered: number; detectionRate: number; falseAlarmRate: number; threshold: number; seed: number; trainN: number; heldOut: string;
  // Conformal calibration: the threshold picked for the target false alarm rate, and what the held out set gave.
  conformalThreshold: number; targetFalseAlarm: number; achievedFalseAlarm: number; coverage: number; calibrationN: number;
  // The Kalman filter against raw sample lengths on the two track features: the filtered pipeline
  // at the fixed |z| threshold, the raw one at the threshold it needs to match that detection on
  // the same inflated claims and compressed clocks.
  trackSmoothingGainPct: number; rawFalseAlarmRate: number; smoothedFalseAlarmRate: number; fixedThreshold: number; rawThreshold: number; matchedDetection: number;
  byTamper: Record<Tamper, { n: number; caught: number }>;
}

export const FEATURES = ["area ratio", "speed", "battery per mu", "altitude variance", "gps innovation"] as const;
export type FeatureName = (typeof FEATURES)[number];
// The features that depend on the track length, the ones the filter changes.
export const TRACK_FEATURES: readonly FeatureName[] = ["area ratio", "speed"];

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (r: () => number, lo: number, hi: number) => lo + r() * (hi - lo);
// Box-Muller: one pair of uniforms gives the two normals a sample needs, so a track depends
// only on its seed, never on what was drawn before it.
const gauss2 = (r: () => number): [number, number] => { const m = Math.sqrt(-2 * Math.log(1 - r())), a = 2 * Math.PI * r(); return [m * Math.cos(a), m * Math.sin(a)]; };

// A spraying track: straight passes a swath apart, joined by slow three second turns, sampled
// at 1 Hz at the given speed, with Gaussian receiver noise of `noiseM` one sigma.
export function syntheticTrack(r: () => number, trackM: number, speedMs: number, swathM: number, noiseM: number, passM = between(r, 80, 250)): GpsTrack {
  // Count first so the columns are allocated once: samples on passes plus three per turn.
  const passes = Math.max(1, Math.ceil(trackM / passM));
  let cap = 1 + 3 * passes;
  for (let left = trackM; left > 0; left -= passM) cap += Math.max(1, Math.round(Math.min(passM, left) / speedMs));
  const t = new Float64Array(cap), xs = new Float64Array(cap), ys = new Float64Array(cap);
  let n = 0, x = 0, y = 0, dir = 1, left = trackM;
  const push = (px: number, py: number) => { const [gx, gy] = gauss2(r); t[n] = n; xs[n] = px + gx * noiseM; ys[n] = py + gy * noiseM; n += 1; };
  push(x, y);
  while (left > 0) {
    const len = Math.min(passM, left);
    const k = Math.max(1, Math.round(len / speedMs));
    for (let i = 0; i < k; i++) { x += dir * len / k; push(x, y); }
    left -= len;
    if (left <= 0) break;
    for (let j = 1; j <= 3; j++) { const a = Math.PI * j / 3; push(x + dir * (swathM / 2) * Math.sin(a), y + (swathM / 2) * (1 - Math.cos(a))); }
    y += swathM; dir = -dir;
  }
  return { n, t: t.subarray(0, n), x: xs.subarray(0, n), y: ys.subarray(0, n) };
}

// Derived features. Each is a physical ratio, so honest flights cluster tightly. With a GPS
// summary the smoothed track stands in for the raw length; without one the innovation feature
// is NaN and scores as zero.
export function derive(f: Flight, useRaw = false): Record<FeatureName, number> {
  const trackM = f.gps && !useRaw ? f.gps.smoothedTrackM : f.trackM;
  const areaMu = trackM * f.swathM / MU_M2;
  return {
    "area ratio": areaMu > 0 ? f.claimedMu / areaMu : 99,
    speed: f.seconds > 0 ? trackM / f.seconds : 99,
    "battery per mu": f.claimedMu > 0 ? f.batteryPct / f.claimedMu : 99,
    "altitude variance": f.altVar,
    "gps innovation": f.gps ? f.gps.innovationRms : NaN,
  };
}

// An honest flight before fusion: its parameters and its samples.
interface Draft { samples: GpsTrack; swathM: number; claimedMu: number; batteryPct: number; altVar: number }

function honest(r: () => number): Draft {
  const swathM = [2, 2.5, 3, 3.5, 4][Math.floor(r() * 5)];
  // Field sizes are skewed: many small plots, a few large ones. Log uniform from 10 to 150 mu.
  const claimedMu = Math.round(Math.exp(between(r, Math.log(10), Math.log(150))));
  const trackM = Math.round(claimedMu * MU_M2 / swathM * between(r, 1.0, 1.08));
  const speed = between(r, 4, 8);
  // Receiver quality, log uniform from a clean sky to a poor one.
  const noiseM = Math.exp(between(r, Math.log(0.5), Math.log(6)));
  const samples = syntheticTrack(r, trackM, speed, swathM, noiseM);
  const batteryPct = Math.round(claimedMu * BATTERY_PER_MU * between(r, 0.9, 1.1) * 10) / 10;
  const altVar = Math.round(ALT_VAR * between(r, 0.8, 1.25) * 1000) / 1000;
  return { samples, swathM, claimedMu, batteryPct, altVar };
}

const TAMPERS: Tamper[] = ["inflated_mu", "replayed_track", "impossible_speed", "battery_too_low", "teleport_jump"];

// Tampered flights. A replay resubmits an earlier honest flight's samples under a new claim
// that matches them, so every ratio looks right and only the track itself gives it away. A
// teleport pastes the first half of the log 150 to 600 metres away as its second half.
function tamper(r: () => number, f: Draft, pool: Draft[]): { draft: Draft; kind: Tamper } {
  let kind = TAMPERS[Math.floor(r() * TAMPERS.length)];
  if (kind === "replayed_track" && pool.length === 0) kind = "inflated_mu";
  switch (kind) {
    case "inflated_mu": return { kind, draft: { ...f, claimedMu: Math.round(f.claimedMu * between(r, 1.6, 3)) } };
    case "replayed_track": {
      const src = pool[Math.floor(r() * pool.length)];
      return { kind, draft: { ...f, samples: src.samples, swathM: src.swathM, claimedMu: src.claimedMu, batteryPct: Math.round(src.claimedMu * BATTERY_PER_MU * between(r, 0.9, 1.1) * 10) / 10 } };
    }
    case "impossible_speed": { const k = between(r, 0.1, 0.3); return { kind, draft: { ...f, samples: { ...f.samples, t: f.samples.t.map((v) => v * k) } } }; }
    case "battery_too_low": return { kind, draft: { ...f, batteryPct: Math.round(f.batteryPct * between(r, 0.15, 0.45) * 10) / 10 } };
    case "teleport_jump": {
      const S = f.samples, h = Math.floor(S.n / 2), n = 2 * h;
      const ang = between(r, 0, 2 * Math.PI), d = between(r, 150, 600);
      const dx = Math.cos(ang) * d, dy = Math.sin(ang) * d;
      const dt = S.n > 1 ? S.t[1] - S.t[0] : 1;
      const t = new Float64Array(n), x = new Float64Array(n), y = new Float64Array(n);
      for (let i = 0; i < h; i++) { t[i] = S.t[i]; x[i] = S.x[i]; y[i] = S.y[i]; t[h + i] = S.t[h - 1] + (i + 1) * dt; x[h + i] = S.x[i] + dx; y[h + i] = S.y[i] + dy; }
      return { kind, draft: { ...f, samples: { n, t, x, y } } };
    }
  }
}

function toFlight(d: Draft, seen: Set<string>): Flight {
  const g = fuse(d.samples, { seen });
  const S = d.samples;
  return {
    trackM: Math.round(g.rawTrackM), seconds: S.n ? Math.round(S.t[S.n - 1] - S.t[0]) : 0, swathM: d.swathM, claimedMu: d.claimedMu, batteryPct: d.batteryPct, altVar: d.altVar,
    gps: { smoothedTrackM: g.smoothedTrackM, innovationRms: g.innovationRms, outliers: g.outliers.length, replayed: g.replayed, noiseM: g.noiseM },
  };
}

export const DATASET: { flight: Flight; tampered: Tamper | null }[] = (() => {
  const r = rng(SEED);
  const seen = new Set<string>();
  const pool: Draft[] = [];
  const out: { flight: Flight; tampered: Tamper | null }[] = [];
  for (let i = 0; i < N; i++) {
    const h = honest(r);
    if (r() < TAMPER_SHARE) { const t = tamper(r, h, pool); out.push({ flight: toFlight(t.draft, seen), tampered: t.kind }); }
    else { out.push({ flight: toFlight(h, seen), tampered: null }); pool.push(h); if (pool.length > 16) pool.shift(); }
  }
  return out;
})();

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// The split: fit, calibrate, hold out. Tampered rows stay in the fit (the median and MAD
// tolerate 15 percent contamination, that is the point of them); calibration uses only the
// honest rows of its slice, because the false alarm rate is a statement about honest flights.
export const FIT_N = Math.round(N * 0.375);
export const TRAIN_N = Math.round(N * 0.75);
export const CALIBRATION = { from: FIT_N, to: TRAIN_N };

export type Model = Record<FeatureName, { median: number; mad: number }>;

function fit(rows: Record<FeatureName, number>[]): Model {
  const out = {} as Model;
  for (const f of FEATURES) {
    const xs = rows.map((r) => r[f]).filter((v) => Number.isFinite(v));
    const med = xs.length ? median(xs) : 0;
    const mad = (xs.length ? median(xs.map((x) => Math.abs(x - med))) : 0) * 1.4826 || 1e-6;
    out[f] = { median: med, mad };
  }
  return out;
}

export const MODEL: Model = fit(DATASET.slice(0, FIT_N).map((d) => derive(d.flight)));
export const MODEL_RAW: Model = fit(DATASET.slice(0, FIT_N).map((d) => derive(d.flight, true)));

// The nonconformity score: largest absolute robust z over the features, with each feature's z.
export function robustZ(flight: Flight, model: Model = MODEL, useRaw = false, features: readonly FeatureName[] = FEATURES): { z: number; zs: Record<FeatureName, number> } {
  const d = derive(flight, useRaw);
  const zs = {} as Record<FeatureName, number>;
  let z = 0;
  for (const f of features) {
    const v = Number.isFinite(d[f]) ? (d[f] - model[f].median) / model[f].mad : 0;
    zs[f] = Math.round(v * 10) / 10;
    z = Math.max(z, Math.abs(v));
  }
  return { z, zs };
}

export const CONFORMAL: Conformal = calibrate(
  DATASET.slice(CALIBRATION.from, CALIBRATION.to).filter((d) => !d.tampered).map((d) => robustZ(d.flight).z),
  TARGET_FALSE_ALARM,
);
export const THRESHOLD = CONFORMAL.threshold;

export function score(flight: Flight, threshold: number = THRESHOLD): Score {
  const { z, zs } = robustZ(flight);
  const reasons: string[] = [];
  for (const f of FEATURES) if (Math.abs(zs[f]) > threshold) reasons.push(`${f} z ${zs[f] > 0 ? "+" : ""}${zs[f]}`);
  if (flight.gps?.replayed) reasons.push("replayed track");
  if (flight.gps && flight.gps.outliers > 0) reasons.push("teleport jump");
  return { z: Math.round(z * 10) / 10, ok: z <= threshold && reasons.length === 0, reasons, zs };
}

export const METRICS: PlausibilityMetrics = (() => {
  const test = DATASET.slice(TRAIN_N);
  let tp = 0, fp = 0, tampered = 0;
  const byTamper = Object.fromEntries(TAMPERS.map((k) => [k, { n: 0, caught: 0 }])) as Record<Tamper, { n: number; caught: number }>;
  const honestRaw: number[] = [], honestSmooth: number[] = [], tamperRaw: number[] = [], tamperSmooth: number[] = [];
  // The smoothing comparison is about the track, so it uses the two track features only (area
  // ratio and speed) and the tamper classes those features can see: an inflated claim and a
  // compressed clock. Battery, altitude, replay and teleport are left out of both sides.
  const rawZ = (f: Flight) => robustZ({ ...f, gps: undefined }, MODEL_RAW, true, TRACK_FEATURES).z;
  const smoothZ = (f: Flight) => robustZ(f, MODEL, false, TRACK_FEATURES).z;
  for (const d of test) {
    const s = score(d.flight);
    if (d.tampered) {
      tampered++; byTamper[d.tampered].n++; if (!s.ok) { tp++; byTamper[d.tampered].caught++; }
      if (d.tampered === "inflated_mu" || d.tampered === "impossible_speed") { tamperRaw.push(rawZ(d.flight)); tamperSmooth.push(smoothZ(d.flight)); }
    } else {
      if (!s.ok) fp++;
      honestRaw.push(rawZ(d.flight));
      honestSmooth.push(smoothZ(d.flight));
    }
  }
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  const honestN = test.length - tampered;
  const smoothFa = exceedRate(honestSmooth, FIXED_THRESHOLD);
  const matched = exceedRate(tamperSmooth, FIXED_THRESHOLD);
  // The raw pipeline's threshold: the highest one that still catches the same share of those
  // tampered flights, so both pipelines are compared at one detection level.
  const need = Math.ceil(matched * tamperRaw.length);
  const rawThreshold = need > 0 ? [...tamperRaw].sort((a, b) => b - a)[need - 1] - 1e-9 : FIXED_THRESHOLD;
  const rawFa = exceedRate(honestRaw, rawThreshold);
  const fa = honestN ? fp / honestN : 0;
  return {
    n: test.length, tampered, detectionRate: r3(tampered ? tp / tampered : 0), falseAlarmRate: r3(fa),
    threshold: THRESHOLD, seed: SEED, trainN: TRAIN_N,
    heldOut: `${test.length} of ${N} synthetic flights held out by seed ${SEED}, ${tampered} tampered; fit on ${FIT_N}, conformal calibration on the honest rows of the next ${TRAIN_N - FIT_N}`,
    conformalThreshold: THRESHOLD, targetFalseAlarm: TARGET_FALSE_ALARM, achievedFalseAlarm: r3(fa), coverage: r3(1 - fa), calibrationN: CONFORMAL.n,
    trackSmoothingGainPct: rawFa > 0 ? Math.round((rawFa - smoothFa) / rawFa * 1000) / 10 : 0, rawFalseAlarmRate: r3(rawFa), smoothedFalseAlarmRate: r3(smoothFa), fixedThreshold: FIXED_THRESHOLD, rawThreshold: r3(rawThreshold), matchedDetection: r3(matched),
    byTamper,
  };
})();
