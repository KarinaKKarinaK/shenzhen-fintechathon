// Wilson score interval for a binomial rate. Used for every rate the repo exports, so a rate
// measured on a small set carries its uncertainty and its n next to it.

export interface Interval { rate: number; lo: number; hi: number; k: number; n: number }

export function wilson(k: number, n: number, z = 1.96): Interval {
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  if (n === 0) return { rate: 0, lo: 0, hi: 1, k, n };
  const p = k / n, z2 = z * z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z / (1 + z2 / n)) * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n));
  return { rate: r3(p), lo: r3(Math.max(0, centre - half)), hi: r3(Math.min(1, centre + half)), k, n };
}

export const fmtInterval = (i: Interval) => `${(i.rate * 100).toFixed(1)}% (95% CI ${(i.lo * 100).toFixed(1)} to ${(i.hi * 100).toFixed(1)}, ${i.k} of ${i.n})`;
