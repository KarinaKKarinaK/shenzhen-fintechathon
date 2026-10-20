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

// Fail safe on missing sensors: battery and altitude are required channels. A log without one,
// or with a reading that is not a number or out of range, is held (ok false, the fee stays
// locked) with a reason naming the channel. Nothing is imputed for a real log, because a value
// predicted from the track would let a log without the sensor pass on the track alone.
// With `samples` the smoothed track replaces trackM; `seen` is the registry a replay is checked
// against, one per session, so the same log twice in one session is caught.
export function plausible(jobId: string, trackM: number, seconds: number, swathM: number, claimedMu: number, batteryPct?: number, altVar?: number, samples?: GpsInput, seen?: Set<string>): Telemetry {
  return assess(jobId, trackM, seconds, swathM, claimedMu, { batteryPct, altVar }, samples, seen);
}

// The channel check. A missing reading and a degraded one (not finite, or outside the range the
// sensor can report) are both reasons to hold.
export function channelFaults(batteryPct?: number, altVar?: number): string[] {
  const out: string[] = [];
  if (batteryPct === undefined || batteryPct === null) out.push("battery channel missing, log held");
  else if (!Number.isFinite(batteryPct) || batteryPct < 0 || batteryPct > 100) out.push("battery channel degraded, log held");
  if (altVar === undefined || altVar === null) out.push("altitude channel missing, log held");
  else if (!Number.isFinite(altVar) || altVar < 0) out.push("altitude channel degraded, log held");
  return out;
}

// "synthetic" is only for honestLog below: a log this module generates itself, whose battery
// and altitude readings are by construction what the physics gives for the flown area.
function assess(jobId: string, trackM: number, seconds: number, swathM: number, claimedMu: number, ch: { batteryPct?: number; altVar?: number } | "synthetic", samples?: GpsInput, seen?: Set<string>): Telemetry {
  const count = samples ? (Array.isArray(samples) ? samples.length : samples.n) : 0;
  const fused = samples && count > 1 ? fuse(samples, { seen }) : undefined;
  const gps = fused ? { smoothedTrackM: fused.smoothedTrackM, innovationRms: fused.innovationRms, outliers: fused.outliers.length, replayed: fused.replayed, noiseM: fused.noiseM } : undefined;
  const track = gps ? gps.smoothedTrackM : trackM;
  const areaMu = Math.round((track * swathM / MU_M2) * 100) / 100;
  const ratio = areaMu > 0 ? Math.round((claimedMu / areaMu) * 100) / 100 : Infinity;
  const faults = ch === "synthetic" ? [] : channelFaults(ch.batteryPct, ch.altVar);
  const battery = ch === "synthetic" ? Math.round(areaMu * BATTERY_PER_MU * 10) / 10 : ch.batteryPct ?? NaN;
  const alt = ch === "synthetic" ? ALT_VAR : ch.altVar ?? NaN;
  // A faulted channel is left out of the score (its z would be meaningless) and the log is held.
  const s = score({ trackM, seconds, swathM, claimedMu, batteryPct: faults.some((f) => f.startsWith("battery")) ? Math.round(areaMu * BATTERY_PER_MU * 10) / 10 : battery, altVar: faults.some((f) => f.startsWith("altitude")) ? ALT_VAR : alt, gps });
  return {
    jobId, trackM: Math.round(track), swathM, seconds, areaMu, claimedMu, ratio, ok: s.ok && faults.length === 0, batteryPct: battery, altVar: alt, z: s.z, reasons: [...faults, ...s.reasons],
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
  return assess(jobId, trackM, samples.t[samples.n - 1], swathM, mu, "synthetic", samples);
}
