// Plausibility oracle for flight logs. Telemetry proves work done, never risk.
// Area the track can support = track length times swath width. One mu is 666.7 square metres.
// The verdict comes from the anomaly model in ml/plausibility.ts: physical ratios scored by
// robust z against 2000 synthetic flights, flagged when any crosses the conformal threshold
// (calibrated for a 2 percent false alarm rate, not set by hand). When GPS samples are given
// the Kalman filter in fusion/kalman.ts supplies the track length, flags a jump the constant
// velocity model cannot explain, and, with a registry of seen tracks, a replayed log.

import { ALT_VAR, BATTERY_PER_MU, MU_M2, THRESHOLD, rng, score, syntheticTrack } from "./ml/plausibility";
import { fuse, type GpsInput } from "./fusion/kalman";
import type { Telemetry } from "./types";

export { MU_M2, THRESHOLD };
export const MAX_SPEED_MS = 12;
export const MAX_RATIO = 1.25;

// batteryPct and altVar default to what the physics predicts for the area the track covered,
// never for the claim, so a caller with only the track and the claim is still scored honestly.
// With `samples` the smoothed track replaces trackM; `seen` is the registry a replay is checked
// against, one per session, so the same log twice in one session is caught.
export function plausible(jobId: string, trackM: number, seconds: number, swathM: number, claimedMu: number, batteryPct?: number, altVar?: number, samples?: GpsInput, seen?: Set<string>): Telemetry {
  const count = samples ? (Array.isArray(samples) ? samples.length : samples.n) : 0;
  const fused = samples && count > 1 ? fuse(samples, { seen }) : undefined;
  const gps = fused ? { smoothedTrackM: fused.smoothedTrackM, innovationRms: fused.innovationRms, outliers: fused.outliers.length, replayed: fused.replayed, noiseM: fused.noiseM } : undefined;
  const track = gps ? gps.smoothedTrackM : trackM;
  const areaMu = Math.round((track * swathM / MU_M2) * 100) / 100;
  const ratio = areaMu > 0 ? Math.round((claimedMu / areaMu) * 100) / 100 : Infinity;
  const battery = batteryPct ?? Math.round(areaMu * BATTERY_PER_MU * 10) / 10;
  const alt = altVar ?? ALT_VAR;
  const s = score({ trackM, seconds, swathM, claimedMu, batteryPct: battery, altVar: alt, gps });
  return {
    jobId, trackM: Math.round(track), swathM, seconds, areaMu, claimedMu, ratio, ok: s.ok, batteryPct: battery, altVar: alt, z: s.z, reasons: s.reasons,
    ...(fused ? { rawTrackM: Math.round(fused.rawTrackM), innovationRms: fused.innovationRms, outliers: fused.outliers.length, replayed: fused.replayed, noiseM: fused.noiseM } : {}),
  };
}

// A log a real flight would produce for the claimed area: a 1 Hz GPS track with 1.5 m receiver
// noise, seeded by the job id so the same job always gives the same log and two jobs never do.
// No registry is passed: a synthesised log is new by construction.
export function honestLog(jobId: string, mu: number, swathM = 3, speedMs = 6): Telemetry {
  let h = 2166136261;
  for (const c of jobId) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const r = rng(h);
  const trackM = Math.round(mu * MU_M2 / swathM * 1.02);
  const samples = syntheticTrack(r, trackM, speedMs, swathM, 1.5, 160);
  return plausible(jobId, trackM, samples.t[samples.n - 1], swathM, mu, undefined, undefined, samples);
}
