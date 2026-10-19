// A constant velocity Kalman filter over GPS samples, with a backward (Rauch Tung Striebel)
// pass so the track is smoothed from both sides. State per axis is position and velocity;
// x and y share one covariance because the measurement noise is isotropic. The measurement
// noise is estimated per flight from second differences of the raw positions, so a cheap
// receiver and a good one both get a gate that means the same thing.
//
// Three things come out: the length of the smoothed track (raw sample lengths are inflated by
// jitter, more so on a noisy receiver), the innovation sequence (measurement minus prediction,
// whose RMS spikes on a spliced log), and a replay key: a hash of the rounded innovations. A
// log submitted twice has the same innovations, so the same key.

export interface GpsSample { t: number; x: number; y: number }
// The same track as three columns: what the generator and the filter work on. A flight of an
// hour at 1 Hz is 3600 samples; 2000 of them as objects would cost more in allocation than
// in arithmetic, so the sample objects are converted once at the edge.
export interface GpsTrack { n: number; t: Float64Array; x: Float64Array; y: Float64Array }
export type GpsInput = GpsSample[] | GpsTrack;

export function toTrack(samples: GpsInput): GpsTrack {
  if (!Array.isArray(samples)) return samples;
  const n = samples.length, t = new Float64Array(n), x = new Float64Array(n), y = new Float64Array(n);
  for (let i = 0; i < n; i++) { t[i] = samples[i].t; x[i] = samples[i].x; y[i] = samples[i].y; }
  return { n, t, x, y };
}
export function toSamples(tr: GpsTrack): GpsSample[] {
  const out: GpsSample[] = [];
  for (let i = 0; i < tr.n; i++) out.push({ t: tr.t[i], x: tr.x[i], y: tr.y[i] });
  return out;
}

export interface Fused {
  n: number;
  rawTrackM: number; // sum of distances between consecutive raw samples
  smoothedTrackM: number; // the same over the smoothed positions
  innovationRms: number; // over every step, rejected samples included
  outliers: number[]; // sample indices the gate rejected: a jump the model cannot explain
  noiseM: number; // the estimated measurement noise, one sigma, metres
  key: string; // hash of the rounded innovation sequence
  replayed: boolean; // true when `seen` already held the key
}

export const ACCEL_SIGMA = 2.0; // process noise, metres per second squared: a turn at a pass end
export const GATE_SIGMA = 6; // an innovation this many sigma out is rejected...
export const GATE_MIN_M = 40; // ...but only when it is also at least this far in metres (a turn lags by under 30)
export const NOISE_FLOOR_M = 0.3;
export const NOISE_CEIL_M = 15;

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Robust one sigma of the measurement noise. For a constant velocity truth the second
// difference of position is pure noise with variance 6 sigma squared; the median absolute
// value ignores turns and jumps.
export function estimateNoise(input: GpsInput): number {
  const { n, x, y } = toTrack(input);
  if (n < 3) return 1;
  // At most 512 evenly spaced second differences: enough for a median, cheap on a long flight.
  const step = Math.max(1, Math.floor((n - 2) / 512));
  const d: number[] = [];
  for (let i = 1; i + 1 < n; i += step) {
    d.push(Math.abs(x[i + 1] - 2 * x[i] + x[i - 1]));
    d.push(Math.abs(y[i + 1] - 2 * y[i] + y[i - 1]));
  }
  const s = median(d) * 1.4826 / Math.sqrt(6);
  return Math.min(NOISE_CEIL_M, Math.max(NOISE_FLOOR_M, s));
}

// FNV-1a over the innovation sequence rounded to centimetres.
export function replayKey(innovations: ArrayLike<number>): string {
  let h = 0x811c9dc5;
  const mix = (v: number) => { h ^= v & 0xff; h = Math.imul(h, 0x01000193) >>> 0; h ^= (v >>> 8) & 0xff; h = Math.imul(h, 0x01000193) >>> 0; h ^= (v >>> 16) & 0xff; h = Math.imul(h, 0x01000193) >>> 0; };
  mix(innovations.length);
  for (let i = 0; i < innovations.length; i++) mix(Math.round(innovations[i] * 100) >>> 0);
  return `${innovations.length}:${h.toString(16).padStart(8, "0")}`;
}

export function rawLength(input: GpsInput): number {
  const { n, x, y } = toTrack(input);
  let L = 0;
  for (let i = 1; i < n; i++) { const dx = x[i] - x[i - 1], dy = y[i] - y[i - 1]; L += Math.sqrt(dx * dx + dy * dy); }
  return L;
}

// Working arrays shared by every call: the filter is synchronous, so one set sized to the
// longest flight seen so far saves allocating twenty arrays per flight.
const NAMES = ["fx", "fvx", "fy", "fvy", "px", "pvx", "py", "pvy", "fa", "fb", "fc", "pa", "pb", "pc", "dts", "sx", "sy", "svx", "svy", "inn"] as const;
type Scratch = Record<(typeof NAMES)[number], Float64Array>;
let SCRATCH: Scratch | null = null;
let SCRATCH_N = 0;
function scratch(n: number): Scratch {
  if (!SCRATCH || SCRATCH_N < n) {
    SCRATCH_N = Math.max(n, 4096);
    SCRATCH = Object.fromEntries(NAMES.map((k) => [k, new Float64Array(SCRATCH_N)])) as Scratch;
  }
  return SCRATCH;
}

// Fuse one flight's samples. When `seen` is given the replay key is checked against it and
// then added, so the same set of samples fused twice is flagged the second time.
export function fuse(input: GpsInput, opts: { seen?: Set<string>; noiseM?: number } = {}): Fused {
  const samples = toTrack(input);
  const { n, t: T, x: X, y: Y } = samples;
  if (n < 2) {
    const key = replayKey([]);
    return { n, rawTrackM: 0, smoothedTrackM: 0, innovationRms: 0, outliers: [], noiseM: opts.noiseM ?? 1, key, replayed: false };
  }
  const sigma = opts.noiseM ?? estimateNoise(samples);
  const R = sigma * sigma;
  const qa = ACCEL_SIGMA * ACCEL_SIGMA;

  // Filtered and predicted states per step, kept for the backward pass. P is [a b; b c].
  const W = scratch(n);
  const { fx, fvx, fy, fvy, px, pvx, py, pvy, fa, fb, fc, pa, pb, pc, dts, sx, sy, svx, svy } = W;
  const inn = W.inn.subarray(0, n - 1);
  const outliers: number[] = [];

  const dt0 = Math.max(1e-3, T[1] - T[0]);
  fx[0] = X[0]; fy[0] = Y[0];
  fvx[0] = (X[1] - X[0]) / dt0; fvy[0] = (Y[1] - Y[0]) / dt0;
  fa[0] = R; fb[0] = 0; fc[0] = 2 * R / (dt0 * dt0) + 25;
  px[0] = fx[0]; py[0] = fy[0]; pvx[0] = fvx[0]; pvy[0] = fvy[0]; pa[0] = fa[0]; pb[0] = fb[0]; pc[0] = fc[0];

  let sumSq = 0;
  for (let k = 1; k < n; k++) {
    const dt = Math.max(1e-3, T[k] - T[k - 1]);
    dts[k] = dt;
    // Predict.
    const xp = fx[k - 1] + fvx[k - 1] * dt, yp = fy[k - 1] + fvy[k - 1] * dt;
    const a = fa[k - 1], b = fb[k - 1], c = fc[k - 1];
    const dt2 = dt * dt;
    const Pa = a + 2 * b * dt + c * dt2 + qa * dt2 * dt2 / 4;
    const Pb = b + c * dt + qa * dt2 * dt / 2;
    const Pc = c + qa * dt * dt;
    px[k] = xp; py[k] = yp; pvx[k] = fvx[k - 1]; pvy[k] = fvy[k - 1]; pa[k] = Pa; pb[k] = Pb; pc[k] = Pc;
    // Innovation and gate.
    const ix = X[k] - xp, iy = Y[k] - yp;
    const S = Pa + R;
    const dist = Math.sqrt(ix * ix + iy * iy);
    inn[k - 1] = dist;
    sumSq += dist * dist;
    if (dist / Math.sqrt(S) > GATE_SIGMA && dist > GATE_MIN_M) {
      outliers.push(k);
      fx[k] = xp; fy[k] = yp; fvx[k] = pvx[k]; fvy[k] = pvy[k]; fa[k] = Pa; fb[k] = Pb; fc[k] = Pc;
      continue;
    }
    // Update. Gain K = P H' / S with H = [1 0].
    const invS = 1 / S;
    const Ka = Pa * invS, Kb = Pb * invS;
    fx[k] = xp + Ka * ix; fvx[k] = pvx[k] + Kb * ix;
    fy[k] = yp + Ka * iy; fvy[k] = pvy[k] + Kb * iy;
    fa[k] = (1 - Ka) * Pa; fb[k] = (1 - Ka) * Pb; fc[k] = Pc - Kb * Pb;
  }

  // Backward pass: C = Pf F' inv(Pp[k+1]); xs[k] = xf[k] + C (xs[k+1] - xp[k+1]).
  sx[n - 1] = fx[n - 1]; sy[n - 1] = fy[n - 1]; svx[n - 1] = fvx[n - 1]; svy[n - 1] = fvy[n - 1];
  for (let k = n - 2; k >= 0; k--) {
    const dt = dts[k + 1];
    const a = fa[k], b = fb[k], c = fc[k];
    // Pf F' = [a + b dt, b; b + c dt, c]
    const m00 = a + b * dt, m01 = b, m10 = b + c * dt, m11 = c;
    const Pa = pa[k + 1], Pb = pb[k + 1], Pc = pc[k + 1];
    const invDet = 1 / (Pa * Pc - Pb * Pb || 1e-9);
    const i00 = Pc * invDet, i01 = -Pb * invDet, i11 = Pa * invDet;
    const C00 = m00 * i00 + m01 * i01, C01 = m00 * i01 + m01 * i11;
    const C10 = m10 * i00 + m11 * i01, C11 = m10 * i01 + m11 * i11;
    const dx = sx[k + 1] - px[k + 1], dvx = svx[k + 1] - pvx[k + 1];
    const dy = sy[k + 1] - py[k + 1], dvy = svy[k + 1] - pvy[k + 1];
    sx[k] = fx[k] + C00 * dx + C01 * dvx; svx[k] = fvx[k] + C10 * dx + C11 * dvx;
    sy[k] = fy[k] + C00 * dy + C01 * dvy; svy[k] = fvy[k] + C10 * dy + C11 * dvy;
  }

  let smoothed = 0;
  for (let k = 1; k < n; k++) { const dx = sx[k] - sx[k - 1], dy = sy[k] - sy[k - 1]; smoothed += Math.sqrt(dx * dx + dy * dy); }
  const key = replayKey(inn);
  const replayed = opts.seen ? opts.seen.has(key) : false;
  opts.seen?.add(key);
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return { n, rawTrackM: r1(rawLength(samples)), smoothedTrackM: r1(smoothed), innovationRms: Math.round(Math.sqrt(sumSq / (n - 1)) * 100) / 100, outliers, noiseM: Math.round(sigma * 100) / 100, key, replayed };
}
