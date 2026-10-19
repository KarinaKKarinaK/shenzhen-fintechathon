// Module level drift monitors. framing.ts feeds every classifier risk score, policy.ts feeds
// every verdict. Both are CUSUM charts over the live stream, so a slow change in what the
// gate sees, or in how often the engine denies, shows up as a rising sum and then an alarm.
// Shadow scopes (the attack set, judge console) are excluded from the deny rate: they are
// supposed to deny, and would drown the signal from the real runs.

import { Cusum, type CusumParams } from "./cusum";
import { evalDetection, type DriftEval } from "./eval";

// Benign scores sit near 0, attacks near 1. Target 0.1 with k 0.25 means a message scoring
// above 0.35 pushes the sum up, h 2 needs roughly four high scores in a row.
export const RISK_PARAMS: CusumParams = { target: 0.1, k: 0.25, h: 2 };
// One deny in a normal run is expected. Target 0.1 and k 0.15 mean a deny adds 0.75,
// an allow takes 0.25 off, h 3 needs four denies in a row or a sustained rate above a quarter.
export const DENY_PARAMS: CusumParams = { target: 0.1, k: 0.15, h: 3 };

export const classifierRisk = new Cusum(RISK_PARAMS);
export const denyRate = new Cusum(DENY_PARAMS);

export function recordRisk(risk: number) { classifierRisk.observe(risk); }

export function recordDecision(verdict: "allow" | "deny" | "escalate", scope = "default") {
  if (scope.startsWith("shadow") || scope === "judge-console" || scope === "selfcheck") return;
  denyRate.observe(verdict === "deny" ? 1 : 0);
}

// Computed once at load on seeded synthetic scores, the number the API and the self check show.
export const EVAL: DriftEval = evalDetection();

export function driftState() {
  return { classifier: classifierRisk.state(), denyRate: denyRate.state(), evalDelay: EVAL.delay, eval: EVAL, params: { classifier: RISK_PARAMS, denyRate: DENY_PARAMS } };
}
