// Split conformal prediction for the anomaly threshold. The model gives every flight a
// nonconformity score (its largest absolute robust z). Rather than fixing the threshold by
// hand, take the scores of honest flights the model was not fitted on and pick the empirical
// quantile at ceil((n + 1)(1 - alpha)) / n. Under exchangeability a new honest flight then
// scores above the threshold with probability at most alpha: the false alarm rate is a
// target you set, not a number you hope for. The held out rate reported next to it is the
// check that the guarantee held on data the calibration never saw.

export interface Conformal { threshold: number; alpha: number; n: number; rank: number }

export function calibrate(scores: number[], alpha: number): Conformal {
  const n = scores.length;
  if (n === 0) return { threshold: Infinity, alpha, n, rank: 0 };
  const s = [...scores].sort((a, b) => a - b);
  const rank = Math.min(n, Math.ceil((n + 1) * (1 - alpha)));
  // rank is one based; when (n + 1)(1 - alpha) exceeds n the set is too small for alpha and
  // the threshold is the largest score seen.
  return { threshold: Math.round(s[rank - 1] * 1000) / 1000, alpha, n, rank };
}

// The share of `scores` above the threshold: the false alarm rate when the scores are honest.
export function exceedRate(scores: number[], threshold: number): number {
  if (scores.length === 0) return 0;
  return scores.filter((s) => s > threshold).length / scores.length;
}
