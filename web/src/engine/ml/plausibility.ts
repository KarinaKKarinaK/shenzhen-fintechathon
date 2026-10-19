// A telemetry anomaly model. 2000 synthetic flights are generated from physical rules with
// noise under a fixed seed; 15 percent are tampered. A robust z-score (median and MAD) is
// fitted per derived feature on the first three quarters, the last quarter is held out and
// scored. A flight is flagged when its largest absolute robust z crosses the threshold.

export const SEED = 7331;
export const N = 2000;
export const TAMPER_SHARE = 0.15;
export const THRESHOLD = 4;
export const MU_M2 = 666.7;
// Honest physics: battery percent used per mu sprayed (the payload and the hover dominate, not
// the track), altitude variance in square metres on a real spraying pass.
export const BATTERY_PER_MU = 0.55;
export const ALT_VAR = 0.25;

export interface Flight { trackM: number; seconds: number; swathM: number; claimedMu: number; batteryPct: number; altVar: number }
export type Tamper = "inflated_mu" | "replayed_track" | "impossible_speed" | "battery_too_low";
export interface Score { z: number; ok: boolean; reasons: string[]; zs: Record<FeatureName, number> }
export interface PlausibilityMetrics { n: number; tampered: number; detectionRate: number; falseAlarmRate: number; threshold: number; seed: number; trainN: number; heldOut: string }

export const FEATURES = ["area ratio", "speed", "battery per mu", "altitude variance"] as const;
export type FeatureName = (typeof FEATURES)[number];

function rng(seed: number): () => number {
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

// Derived features. Each is a physical ratio, so honest flights cluster tightly.
export function derive(f: Flight): Record<FeatureName, number> {
  const areaMu = f.trackM * f.swathM / MU_M2;
  return {
    "area ratio": areaMu > 0 ? f.claimedMu / areaMu : 99,
    speed: f.seconds > 0 ? f.trackM / f.seconds : 99,
    "battery per mu": f.claimedMu > 0 ? f.batteryPct / f.claimedMu : 99,
    "altitude variance": f.altVar,
  };
}

function honest(r: () => number): Flight {
  const swathM = [2, 2.5, 3, 3.5, 4][Math.floor(r() * 5)];
  const claimedMu = Math.round(between(r, 10, 150));
  const trackM = Math.round(claimedMu * MU_M2 / swathM * between(r, 1.0, 1.08));
  const speed = between(r, 4, 8);
  const seconds = Math.round(trackM / speed * between(r, 0.97, 1.05));
  const batteryPct = Math.round(claimedMu * BATTERY_PER_MU * between(r, 0.9, 1.1) * 10) / 10;
  const altVar = Math.round(ALT_VAR * between(r, 0.8, 1.25) * 1000) / 1000;
  return { trackM, seconds, swathM, claimedMu, batteryPct, altVar };
}

function tamper(r: () => number, f: Flight): { flight: Flight; kind: Tamper } {
  const kinds: Tamper[] = ["inflated_mu", "replayed_track", "impossible_speed", "battery_too_low"];
  const kind = kinds[Math.floor(r() * kinds.length)];
  switch (kind) {
    case "inflated_mu": return { kind, flight: { ...f, claimedMu: Math.round(f.claimedMu * between(r, 1.6, 3)) } };
    // A copied log: flat altitude and a battery figure that does not match the flight.
    case "replayed_track": return { kind, flight: { ...f, altVar: Math.round(between(r, 0, 0.02) * 1000) / 1000, batteryPct: Math.round(f.batteryPct * between(r, 0.1, 0.4) * 10) / 10 } };
    case "impossible_speed": return { kind, flight: { ...f, seconds: Math.round(f.seconds * between(r, 0.1, 0.3)) } };
    case "battery_too_low": return { kind, flight: { ...f, batteryPct: Math.round(f.batteryPct * between(r, 0.15, 0.45) * 10) / 10 } };
  }
}

export const DATASET: { flight: Flight; tampered: Tamper | null }[] = (() => {
  const r = rng(SEED);
  const out: { flight: Flight; tampered: Tamper | null }[] = [];
  for (let i = 0; i < N; i++) {
    const h = honest(r);
    if (r() < TAMPER_SHARE) { const t = tamper(r, h); out.push({ flight: t.flight, tampered: t.kind }); }
    else out.push({ flight: h, tampered: null });
  }
  return out;
})();

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Robust location and scale per feature, fitted on the first three quarters (tampered rows
// included: the median and MAD tolerate 15 percent contamination, that is the point of them).
const TRAIN_N = Math.round(N * 0.75);
export const MODEL: Record<FeatureName, { median: number; mad: number }> = (() => {
  const rows = DATASET.slice(0, TRAIN_N).map((d) => derive(d.flight));
  const out = {} as Record<FeatureName, { median: number; mad: number }>;
  for (const f of FEATURES) {
    const xs = rows.map((r) => r[f]);
    const med = median(xs);
    const mad = median(xs.map((x) => Math.abs(x - med))) * 1.4826 || 1e-6;
    out[f] = { median: med, mad };
  }
  return out;
})();

export function score(flight: Flight): Score {
  const d = derive(flight);
  const zs = {} as Record<FeatureName, number>;
  const reasons: string[] = [];
  let z = 0;
  for (const f of FEATURES) {
    const v = (d[f] - MODEL[f].median) / MODEL[f].mad;
    zs[f] = Math.round(v * 10) / 10;
    z = Math.max(z, Math.abs(v));
    if (Math.abs(v) > THRESHOLD) reasons.push(`${f} z ${v > 0 ? "+" : ""}${zs[f]}`);
  }
  return { z: Math.round(z * 10) / 10, ok: z <= THRESHOLD, reasons, zs };
}

export const METRICS: PlausibilityMetrics = (() => {
  const test = DATASET.slice(TRAIN_N);
  let tp = 0, fp = 0, tampered = 0;
  for (const d of test) {
    const s = score(d.flight);
    if (d.tampered) { tampered++; if (!s.ok) tp++; }
    else if (!s.ok) fp++;
  }
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  return {
    n: test.length, tampered, detectionRate: r3(tampered ? tp / tampered : 0), falseAlarmRate: r3(test.length - tampered ? fp / (test.length - tampered) : 0),
    threshold: THRESHOLD, seed: SEED, trainN: TRAIN_N,
    heldOut: `${test.length} of ${N} synthetic flights held out by seed ${SEED}, ${tampered} tampered`,
  };
})();
