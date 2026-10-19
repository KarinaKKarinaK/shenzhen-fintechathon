// The day planner. A bounded knapsack over the day's candidate jobs: each job at most once,
// total mu within the battery budget (mu per charge times charges), total minutes within the
// day. Solved exactly by dynamic programming, maximising margin. The reserve rule is a hard
// filter before the knapsack: a job below it is declined whatever the budget says.

import type { Economics, PlanItem } from "./types";

export const MIN_PER_MU = 0.8; // spraying time per mu at the demo speed and swath
export const TRAVEL_MS = 6; // metres per second to and from the field
export const TURNAROUND_MIN = 6; // landing, refill, take off
const SLOT_MIN = 5; // time resolution of the knapsack

export interface CandidateJob { id: string; title: string; fee: number; mu: number; distanceM: number; windowMin: number }
export type PlanReason = "clears" | "below" | "budget" | "window";
export interface PlanInput {
  jobs: CandidateJob[];
  budgetMu: number; // mu per charge
  charges: number;
  dayMinutes: number;
  eco: (fee: number, mu: number) => Economics;
  reason: (key: PlanReason, vars: Record<string, number>) => string;
}
export interface PlanResult { items: PlanItem[]; budgetMu: number; usedMu: number; charges: number; chargesUsed: number; totalMargin: number; usedMinutes: number; method: "knapsack" }

const round = (n: number) => Math.round(n * 100) / 100;

export function minutesFor(job: CandidateJob): number {
  return Math.ceil(job.mu * MIN_PER_MU + (2 * job.distanceM) / TRAVEL_MS / 60 + TURNAROUND_MIN);
}

export function plan(input: PlanInput): PlanResult {
  const capMu = Math.floor(input.budgetMu * input.charges);
  const slots = Math.floor(input.dayMinutes / SLOT_MIN);
  const rows = input.jobs.map((j) => ({ j, eco: input.eco(j.fee, j.mu), min: minutesFor(j) }));
  // Hard filters first: the reserve rule, then the job's own window.
  const eligible = rows.filter((r) => r.eco.clears && r.min <= r.j.windowMin);
  const n = eligible.length;
  const W = capMu + 1, H = slots + 1;
  // dp[i] is the best margin using the first i eligible jobs, indexed by mu used and slots used.
  let prev = new Float64Array(W * H);
  const take: Uint8Array[] = [];
  for (let i = 0; i < n; i++) {
    const { j, eco, min } = eligible[i];
    const mu = Math.ceil(j.mu), sl = Math.ceil(min / SLOT_MIN);
    const cur = new Float64Array(prev);
    const t = new Uint8Array(W * H);
    for (let m = mu; m < W; m++) {
      for (let s = sl; s < H; s++) {
        const with_ = prev[(m - mu) * H + (s - sl)] + eco.margin;
        if (with_ > cur[m * H + s]) { cur[m * H + s] = with_; t[m * H + s] = 1; }
      }
    }
    take.push(t);
    prev = cur;
  }
  // Best cell, then walk back to find which jobs it took.
  let bm = 0, bs = 0, best = 0;
  for (let m = 0; m < W; m++) for (let s = 0; s < H; s++) if (prev[m * H + s] > best) { best = prev[m * H + s]; bm = m; bs = s; }
  const chosen = new Set<string>();
  for (let i = n - 1; i >= 0; i--) {
    if (take[i][bm * H + bs]) { chosen.add(eligible[i].j.id); bm -= Math.ceil(eligible[i].j.mu); bs -= Math.ceil(eligible[i].min / SLOT_MIN); }
  }
  // Accepted jobs fly in order of margin per mu, the best use of a charge first.
  const accepted = rows.filter((r) => chosen.has(r.j.id)).sort((a, b) => b.eco.margin / b.j.mu - a.eco.margin / a.j.mu);
  const orderOf = new Map(accepted.map((r, i) => [r.j.id, i + 1]));
  const items: PlanItem[] = rows
    .map(({ j, eco, min }) => {
      const key: PlanReason = !eco.clears ? "below" : min > j.windowMin ? "window" : chosen.has(j.id) ? "clears" : "budget";
      return {
        jobId: j.id, title: j.title, fee: eco.fee, margin: eco.margin, marginPerMu: round(eco.margin / j.mu), clears: eco.clears,
        reason: input.reason(key, { margin: eco.margin, rule: eco.reserveRule, budget: capMu, mu: j.mu, minutes: min, window: j.windowMin }),
        order: orderOf.get(j.id) ?? null, mu: j.mu, minutes: min, accepted: chosen.has(j.id), why: key,
      };
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || b.marginPerMu - a.marginPerMu);
  const usedMu = accepted.reduce((s, r) => s + r.j.mu, 0);
  const usedMinutes = accepted.reduce((s, r) => s + r.min, 0);
  return { items, budgetMu: input.budgetMu, usedMu, charges: input.charges, chargesUsed: Math.ceil(usedMu / input.budgetMu), totalMargin: round(best), usedMinutes, method: "knapsack" };
}
