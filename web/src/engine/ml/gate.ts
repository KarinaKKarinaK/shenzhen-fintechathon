// A learned message classifier. Logistic regression over hashed character n-grams (1 to 3:
// single characters and pairs carry the Chinese signal, triples the English), trained at
// module load on the corpus in corpus.ts. Weights are averaged over the second half of
// training, which steadies SGD on a small corpus. No dependencies. A quarter of the corpus is held
// out by a fixed seed and never trained on; METRICS are computed on that quarter only.
// The classifier adds a risk score to the rule gate in framing.ts, it never replaces it.

import { CORPUS } from "./corpus";

export const SEED = 20251020;
export const BUCKETS = 1 << 14;
export const HOLD_OUT = 0.25;
export const THRESHOLD = 0.8;
const EPOCHS = 200;
const LR = 2;
const L2 = 1e-5;
const NGRAMS = [1, 2, 3];

export interface Classification { p: number; label: "attack" | "benign"; topFeatures: string[] }
export interface GateMetrics { trainN: number; testN: number; accuracy: number; precision: number; recall: number; f1: number; falseAlarmRate: number; seed: number; threshold: number; heldOut: string }

// mulberry32: a small seeded PRNG so the split and the shuffles are the same on every load.
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a over the code points of a 3-gram.
function hash(gram: string): number {
  let h = 0x811c9dc5;
  for (const ch of gram) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % BUCKETS;
}

// Same folding as the rule gate: NFKC, zero width and bidi controls dropped, whitespace collapsed, lower case.
function fold(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[​-‏⁠-⁤﻿‪-‮⁦-⁩­]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 2000);
}

const GRAM_OF: string[] = new Array(BUCKETS).fill("");

// Sparse feature vector: bucket -> log(1 + count), L2 normalised.
function features(text: string): Map<number, number> {
  const s = ` ${fold(text)} `;
  const counts = new Map<number, number>();
  const chars = Array.from(s);
  for (const n of NGRAMS) {
    for (let i = 0; i + n <= chars.length; i++) {
      const g = chars.slice(i, i + n).join("");
      const b = hash(g);
      if (!GRAM_OF[b]) GRAM_OF[b] = g;
      counts.set(b, (counts.get(b) ?? 0) + 1);
    }
  }
  let norm = 0;
  for (const [b, c] of counts) { const v = Math.log1p(c); counts.set(b, v); norm += v * v; }
  norm = Math.sqrt(norm) || 1;
  for (const [b, v] of counts) counts.set(b, v / norm);
  return counts;
}

const W = new Float64Array(BUCKETS);
let bias = 0;

function dot(x: Map<number, number>): number {
  let z = bias;
  for (const [b, v] of x) z += W[b] * v;
  return z;
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

function train(rows: { x: Map<number, number>; y: number }[]): void {
  const r = rng(SEED + 1);
  const idx = rows.map((_, i) => i);
  const sumW = new Float64Array(BUCKETS);
  let sumB = 0, n = 0;
  for (let e = 0; e < EPOCHS; e++) {
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const lr = LR / (1 + e * 0.05);
    for (const i of idx) {
      const { x, y } = rows[i];
      const g = sigmoid(dot(x)) - y;
      for (const [b, v] of x) W[b] -= lr * (g * v + L2 * W[b]);
      bias -= lr * g;
    }
    if (e >= EPOCHS / 2) { n++; sumB += bias; for (let b = 0; b < BUCKETS; b++) sumW[b] += W[b]; }
  }
  for (let b = 0; b < BUCKETS; b++) W[b] = sumW[b] / n;
  bias = sumB / n;
}

// Fixed split: shuffle the corpus with the seed, hold out the first quarter.
const split = (() => {
  const r = rng(SEED);
  const idx = CORPUS.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const cut = Math.round(idx.length * HOLD_OUT);
  return { test: idx.slice(0, cut), train: idx.slice(cut) };
})();

const rows = CORPUS.map((c) => ({ x: features(c.text), y: c.label === "attack" ? 1 : 0 }));
train(split.train.map((i) => rows[i]));

function evaluate(): GateMetrics {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  for (const i of split.test) {
    const p = sigmoid(dot(rows[i].x));
    const pred = p > 0.5 ? 1 : 0;
    const y = rows[i].y;
    if (pred === 1 && y === 1) tp++;
    else if (pred === 0 && y === 0) tn++;
    else if (pred === 1 && y === 0) fp++;
    else fn++;
  }
  const n = split.test.length;
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
  return {
    trainN: split.train.length, testN: n,
    accuracy: r3((tp + tn) / n), precision: r3(precision), recall: r3(recall), f1: r3(f1),
    falseAlarmRate: r3(fp + tn ? fp / (fp + tn) : 0),
    seed: SEED, threshold: THRESHOLD,
    heldOut: `${n} of ${CORPUS.length} messages held out by seed ${SEED}, never trained on`,
  };
}

export const METRICS: GateMetrics = evaluate();

export function classify(text: string): Classification {
  const x = features(text);
  const p = Math.round(sigmoid(dot(x)) * 1000) / 1000;
  const contrib = Array.from(x).map(([b, v]) => ({ g: GRAM_OF[b], c: W[b] * v })).filter((f) => f.g && f.c > 0).sort((a, b) => b.c - a.c);
  const seen = new Set<string>();
  const topFeatures: string[] = [];
  for (const f of contrib) { const g = f.g.trim(); if (g && !seen.has(g)) { seen.add(g); topFeatures.push(g); } if (topFeatures.length === 5) break; }
  return { p, label: p > 0.5 ? "attack" : "benign", topFeatures };
}
