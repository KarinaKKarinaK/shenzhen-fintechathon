// Plausibility oracle for flight logs. Telemetry proves work done, never risk.
// Area the track can support = track length times swath width. One mu is 666.7 square metres.
// The verdict comes from the anomaly model in ml/plausibility.ts: four physical ratios scored
// by robust z against 2000 synthetic flights, flagged when any crosses the threshold.

import { ALT_VAR, BATTERY_PER_MU, MU_M2, score } from "./ml/plausibility";
import type { Telemetry } from "./types";

export { MU_M2 };
export const MAX_SPEED_MS = 12;
export const MAX_RATIO = 1.25;

// batteryPct and altVar default to what the physics predicts for the area the track covered,
// never for the claim, so a caller with only the track and the claim is still scored honestly.
export function plausible(jobId: string, trackM: number, seconds: number, swathM: number, claimedMu: number, batteryPct?: number, altVar?: number): Telemetry {
  const areaMu = Math.round((trackM * swathM / MU_M2) * 100) / 100;
  const ratio = areaMu > 0 ? Math.round((claimedMu / areaMu) * 100) / 100 : Infinity;
  const battery = batteryPct ?? Math.round(areaMu * BATTERY_PER_MU * 10) / 10;
  const alt = altVar ?? ALT_VAR;
  const s = score({ trackM, seconds, swathM, claimedMu, batteryPct: battery, altVar: alt });
  return { jobId, trackM: Math.round(trackM), swathM, seconds, areaMu, claimedMu, ratio, ok: s.ok, batteryPct: battery, altVar: alt, z: s.z, reasons: s.reasons };
}

// A log a real flight would produce for the claimed area.
export function honestLog(jobId: string, mu: number, swathM = 3, speedMs = 6): Telemetry {
  const trackM = Math.round(mu * MU_M2 / swathM * 1.02);
  return plausible(jobId, trackM, Math.round(trackM / speedMs), swathM, mu);
}
