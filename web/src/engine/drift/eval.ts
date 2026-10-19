// Synthetic evaluation of the risk score CUSUM on a fixed seed. 500 benign scores then 100
// attack scores: the alarm must fire within 20 observations of the shift. 600 benign scores:
// it must stay quiet. Scores are drawn, not classified: benign scores sit in 0 to 0.3 with one
// in twenty spiking to 0.6, the way the classifier scores a borderline real message; attack
// scores sit in 0.6 to 1. The eval measures the detector, not the classifier.

import { rng } from "../ml/gate";
import { Cusum, type CusumParams } from "./cusum";

export const EVAL_SEED = 20251020;
export const BENIGN_N = 500, ATTACK_N = 100, QUIET_N = 600, MAX_DELAY = 20;

export interface DriftEval { seed: number; shiftAt: number; delay: number | null; quietAlarms: number; params: CusumParams; note: string }

const PARAMS: CusumParams = { target: 0.1, k: 0.25, h: 2 };

export function benignScore(r: () => number) { return r() < 0.05 ? 0.4 + r() * 0.2 : r() * 0.3; }
export function attackScore(r: () => number) { return 0.6 + r() * 0.4; }

export function evalDetection(params: CusumParams = PARAMS, seed = EVAL_SEED): DriftEval {
  const r = rng(seed);
  const c = new Cusum(params);
  let delay: number | null = null;
  for (let i = 0; i < BENIGN_N; i++) if (c.observe(benignScore(r)).alarm) delay = -1;
  for (let i = 0; i < ATTACK_N && delay === null; i++) if (c.observe(attackScore(r)).alarm) delay = i + 1;
  const q = new Cusum(params);
  let quietAlarms = 0;
  for (let i = 0; i < QUIET_N; i++) if (q.observe(benignScore(r)).alarm) quietAlarms += 1;
  return {
    seed, shiftAt: BENIGN_N, delay, quietAlarms, params,
    note: delay === -1 ? "alarmed before the shift" : delay === null ? "never alarmed" : `alarm ${delay} observations after the shift, ${quietAlarms} false alarms in ${QUIET_N} benign scores, synthetic scores on seed ${seed}`,
  };
}
