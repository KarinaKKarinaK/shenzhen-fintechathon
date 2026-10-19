// The strategy ratchet. A strategy is four knobs the agent may tune. The eval is frozen: a
// week of job offers generated from a fixed seed, scored with the same economics the wallet
// uses, with the lender's reserve rule as a hard constraint. The strategy is a plain object
// passed in; it cannot reach the seed, the offers or the scoring. Hill climbing keeps a step
// only when the frozen eval says profit went up, and logs every step either way.

import { economics } from "./agents";
import { DEMO } from "./policy";

export interface Strategy { reserveRule: number; minMarginPerMu: number; maxJobsPerCharge: number; acceptLowFeeIfIdle: boolean }
export interface Step { step: number; proposal: Strategy; change: string; profit: number; kept: boolean; violation?: string }
export interface RatchetResult { steps: Step[]; best: Strategy; baseline: Strategy; baselineProfit: number; bestProfit: number; evalSeed: number; walkSeed: number; days: number; offers: number }

export const EVAL_SEED = 4242;
export const WALK_SEED = 99;
export const DAYS = 7;
export const CHARGES_PER_DAY = 4;
export const BUDGET_MU = 55;
export const FIXED_PER_DAY = 60; // the pilot's time and upkeep, yuan

// The baseline is the cautious hand tuned strategy: one job per charge, a high margin floor.
export const BASELINE: Strategy = { reserveRule: DEMO.reserveRule, minMarginPerMu: 3, maxJobsPerCharge: 1, acceptLowFeeIfIdle: false };

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Offer { mu: number; rate: number }
const RATES = [2.5, 3, 3, 3.5, 4, 4, 4.5, 5, 5, 6, 8, 10, 15];

// The frozen week. Built once from EVAL_SEED, never from anything the strategy holds.
const WEEK: Offer[][] = (() => {
  const r = rng(EVAL_SEED);
  const days: Offer[][] = [];
  for (let d = 0; d < DAYS; d++) {
    const n = 4 + Math.floor(r() * 5);
    const offers: Offer[] = [];
    for (let i = 0; i < n; i++) offers.push({ mu: 10 + Math.round(r() * 110), rate: RATES[Math.floor(r() * RATES.length)] });
    days.push(offers);
  }
  return days;
})();

const round = (n: number) => Math.round(n * 100) / 100;

// Profit after instalments for the week. Negative infinity when the strategy breaks the
// lender's reserve rule, so a lower floor can never look like an improvement.
export function evaluate(s: Strategy): { profit: number; violation?: string } {
  if (s.reserveRule < DEMO.reserveRule) return { profit: -Infinity, violation: `reserve rule ${s.reserveRule} is below the lender's floor of ${DEMO.reserveRule}` };
  if (s.maxJobsPerCharge < 1 || s.maxJobsPerCharge > 6 || s.minMarginPerMu < 0) return { profit: -Infinity, violation: "knob out of range" };
  let profit = -FIXED_PER_DAY * DAYS;
  for (const day of WEEK) {
    const charges = Array.from({ length: CHARGES_PER_DAY }, () => ({ mu: 0, jobs: 0 }));
    const scored = day.map((o) => ({ o, eco: economics(round(o.mu * o.rate), DEMO.leaseRate, round(o.mu * DEMO.energyPerMu), s.reserveRule) }))
      .sort((a, b) => b.eco.margin / b.o.mu - a.eco.margin / a.o.mu);
    const fits = (o: Offer) => charges.find((c) => c.jobs < s.maxJobsPerCharge && c.mu + o.mu <= BUDGET_MU);
    let took = 0;
    for (const { o, eco } of scored) {
      if (!eco.clears || eco.margin / o.mu < s.minMarginPerMu) continue;
      const c = fits(o);
      if (!c) continue;
      if (eco.margin < DEMO.reserveRule) return { profit: -Infinity, violation: "accepted a job below the lender's floor" };
      c.mu += o.mu; c.jobs += 1; profit += eco.margin; took += 1;
    }
    if (took === 0 && s.acceptLowFeeIfIdle) {
      // Idle day: take the best job that still clears the reserve rule, whatever its margin per mu.
      const o = scored.find((x) => x.eco.clears && fits(x.o));
      if (o) profit += o.eco.margin;
    }
  }
  return { profit: round(profit) };
}

function propose(r: () => number, s: Strategy): { next: Strategy; change: string } {
  const pick = Math.floor(r() * 4);
  const choice = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  switch (pick) {
    case 0: { const d = choice([-10, -5, 5, 10]); return { next: { ...s, reserveRule: s.reserveRule + d }, change: `reserveRule ${s.reserveRule} to ${s.reserveRule + d}` }; }
    case 1: { const d = choice([-0.5, -0.25, 0.25, 0.5]); const v = Math.max(0, round(s.minMarginPerMu + d)); return { next: { ...s, minMarginPerMu: v }, change: `minMarginPerMu ${s.minMarginPerMu} to ${v}` }; }
    case 2: { const d = choice([-1, 1]); const v = s.maxJobsPerCharge + d; return { next: { ...s, maxJobsPerCharge: v }, change: `maxJobsPerCharge ${s.maxJobsPerCharge} to ${v}` }; }
    default: return { next: { ...s, acceptLowFeeIfIdle: !s.acceptLowFeeIfIdle }, change: `acceptLowFeeIfIdle ${s.acceptLowFeeIfIdle} to ${!s.acceptLowFeeIfIdle}` };
  }
}

// The walk and the eval are seeded, so the result for a step count never changes. Cached per
// step count in module memory for the API.
const cache = new Map<number, RatchetResult>();
export function cached(steps: number): RatchetResult {
  const n = Math.min(500, Math.max(1, Math.floor(steps) || 60));
  let r = cache.get(n);
  if (!r) { r = run(n); cache.set(n, r); }
  return r;
}

export function run(steps = 60): RatchetResult {
  const r = rng(WALK_SEED);
  const baselineProfit = evaluate(BASELINE).profit;
  let best = { ...BASELINE };
  let bestProfit = baselineProfit;
  const log: Step[] = [];
  for (let i = 1; i <= steps; i++) {
    const { next, change } = propose(r, best);
    const e = evaluate(next);
    const kept = e.profit > bestProfit;
    log.push({ step: i, proposal: next, change, profit: e.profit === -Infinity ? -1e9 : e.profit, kept, violation: e.violation });
    if (kept) { best = next; bestProfit = e.profit; }
  }
  return { steps: log, best, baseline: BASELINE, baselineProfit, bestProfit, evalSeed: EVAL_SEED, walkSeed: WALK_SEED, days: DAYS, offers: WEEK.reduce((s, d) => s + d.length, 0) };
}
