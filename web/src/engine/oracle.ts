// Plausibility oracle for flight logs. Telemetry proves work done, never risk.
// Area the track can support = track length times swath width. One mu is 666.7 square metres.

import type { Telemetry } from "./types";

export const MU_M2 = 666.7;
export const MAX_SPEED_MS = 12;
export const MAX_RATIO = 1.25;

export function plausible(jobId: string, trackM: number, seconds: number, swathM: number, claimedMu: number): Telemetry {
  const areaMu = Math.round((trackM * swathM / MU_M2) * 100) / 100;
  const ratio = areaMu > 0 ? Math.round((claimedMu / areaMu) * 100) / 100 : Infinity;
  const speed = seconds > 0 ? trackM / seconds : Infinity;
  const ok = ratio <= MAX_RATIO && speed <= MAX_SPEED_MS;
  return { jobId, trackM: Math.round(trackM), swathM, seconds, areaMu, claimedMu, ratio, ok };
}

// A log a real flight would produce for the claimed area.
export function honestLog(jobId: string, mu: number, swathM = 3, speedMs = 6): Telemetry {
  const trackM = Math.round(mu * MU_M2 / swathM * 1.02);
  return plausible(jobId, trackM, Math.round(trackM / speedMs), swathM, mu);
}
