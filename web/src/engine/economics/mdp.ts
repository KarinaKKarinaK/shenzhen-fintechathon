// A finite horizon Markov decision process for the lease. The operations research model:
// dynamic programming over the weeks of a season, where the state is what the pilot knows at
// the start of a week (lease balance bucket, pilot bond bucket, this week's weather, the best
// job class on offer) and the action is accept, decline or idle. Weather and demand come from
// a seeded model, rewards from the same economics() function the wallet uses. Backward value
// iteration over the horizon gives the best action per state and the expected season profit.
// The greedy rule (accept whatever clears the reserve rule) is simulated on the same seeded
// seasons for an honest comparison.

import { economics, BOND_SLICE } from "../agents";
import { DEMO } from "../policy";
import { mean, rng, round, variance } from "./rng";

export const CLASSES = ["low", "standard", "premium"] as const;
export type JobClass = (typeof CLASSES)[number];
export const OFFERS = ["none", ...CLASSES] as const;
export type Offer = (typeof OFFERS)[number];
export const WEATHERS = ["dry", "wet"] as const;
export type Weather = (typeof WEATHERS)[number];
export const ACTIONS = ["accept", "decline", "idle"] as const;
export type Action = (typeof ACTIONS)[number];

export interface MdpParams {
  horizon: number; // weeks in the season
  leaseBalance: number; // yuan owed at week 0
  leaseStep: number; // lease bucket width in yuan
  bondStep: number; // bond bucket width in yuan
  reserveRule: number; // minimum margin per job, the lender's floor
  minMarginPerMu: number; // the strategy's own floor on margin per mu, 0 for none
  leaseRate: number; // instalment share of each fee
  seed: number; // seed of the simulated seasons
  seasons: number; // simulated seasons in the comparison
}

// 12,000 yuan is a drone a few seasons into its lease, so the title is reachable inside one
// 26 week horizon and the model has something to aim for.
export const DEFAULTS: MdpParams = { horizon: 26, leaseBalance: 12_000, leaseStep: 500, bondStep: 250, reserveRule: DEMO.reserveRule, minMarginPerMu: 0, leaseRate: DEMO.leaseRate, seed: 2026, seasons: 200 };

// The demand model, in yuan per mu and jobs per week.
export const RATE: Record<JobClass, number> = { low: 3, standard: 5, premium: 10 };
export const MU_PER_JOB = 60;
export const JOBS_PER_WEEK: Record<Weather, number> = { dry: 5, wet: 3 };
export const ENERGY_PER_MU: Record<Weather, number> = { dry: DEMO.energyPerMu, wet: round(DEMO.energyPerMu * 1.35) };
export const FIXED_PER_WEEK = 420; // the pilot's time and upkeep, 60 yuan a day
export const IDLE_PER_WEEK = 210; // a parked drone: upkeep only
export const LISTED_RATE_CUT = 0.05; // a bond at the minimum earns a better lease rate
const COLD_NONE = 0.2; // a week idle sends this much offer mass to "none" the week after

// Season shape: demand and rain both peak mid season.
export const season = (week: number, horizon: number) => Math.sin((Math.PI * (week + 0.5)) / horizon);
export const wetProbability = (week: number, horizon: number) => 0.15 + 0.3 * season(week, horizon);

const BASE: Record<Weather, number[]> = { dry: [0.1, 0.3, 0.4, 0.2], wet: [0.4, 0.3, 0.2, 0.1] };

// Offer distribution for a week, indexed like OFFERS. The listed shift moves mass from low to
// premium (the board lists bonded pilots first), the season shift does the same mid season,
// and a cold week after idling moves mass to none.
export function offerDistribution(week: number, horizon: number, weather: Weather, listed: boolean, cold: boolean): number[] {
  const d = [...BASE[weather]];
  const shift = Math.min(d[1], 0.15 * season(week, horizon) + (listed ? 0.1 : 0));
  d[1] -= shift; d[3] += shift;
  if (cold) {
    const none = d[0] + COLD_NONE;
    const k = (1 - none) / (1 - d[0]);
    return [none, d[1] * k, d[2] * k, d[3] * k];
  }
  return d;
}

export interface WeekOutcome { fee: number; instalment: number; bondFill: number; cash: number; eligible: boolean }

// One week of work in a job class: n jobs at the class rate, each through economics(). The
// instalment stops at the balance owed. Cash is what reaches the pilot's wallet after the
// bond slice and the week's fixed cost. The bond held in escrow is not counted as profit.
export function week(cls: JobClass, weather: Weather, leaseOwed: number, bondGap: number, rate: number, p: Pick<MdpParams, "reserveRule" | "minMarginPerMu">): WeekOutcome {
  const n = JOBS_PER_WEEK[weather];
  const fee = round(MU_PER_JOB * RATE[cls]);
  const eco = economics(fee, leaseOwed > 0 ? rate : 0, round(MU_PER_JOB * ENERGY_PER_MU[weather]), p.reserveRule);
  const eligible = eco.clears && eco.margin / MU_PER_JOB >= p.minMarginPerMu;
  const asked = round(n * eco.instalment);
  const instalment = Math.min(asked, leaseOwed);
  const bondFill = Math.min(bondGap, round(n * fee * BOND_SLICE));
  const cash = round(n * eco.margin + (asked - instalment) - bondFill - FIXED_PER_WEEK);
  return { fee: round(n * fee), instalment, bondFill, cash, eligible };
}

export interface PolicyTable {
  at(week: number, leaseOwed: number, bond: number, weather: Weather, offer: Offer): Action;
  table: Uint8Array; // action index per state, week major
  states: number;
  counts: Record<Action, number>;
}

export interface SeasonStats { meanProfit: number; variance: number; sd: number; titleShare: number; weeksToTitle: number | null; seasons: number }
export interface Comparison { mdp: SeasonStats; greedy: SeasonStats; seed: number; seasons: number; advantage: number }
export interface Solution { policy: PolicyTable; expectedProfit: number; weeksToTitle: number | null; titleShare: number; comparison: Comparison; params: MdpParams; states: number }

interface Model { p: MdpParams; LB: number; BB: number; perWeek: number; idx(lb: number, bb: number, w: number, o: number): number; listed(bb: number): boolean }

function model(p: MdpParams): Model {
  const LB = Math.ceil(p.leaseBalance / p.leaseStep) + 1;
  const BB = Math.ceil(DEMO.bondMin / p.bondStep) + 1;
  const perWeek = LB * BB * WEATHERS.length * OFFERS.length;
  return { p, LB, BB, perWeek, idx: (lb, bb, w, o) => ((lb * BB + bb) * WEATHERS.length + w) * OFFERS.length + o, listed: (bb) => bb >= BB - 1 };
}

// Reward and the deterministic part of the transition for an action in a state. Bucket values
// are the bucket's lower edge. The next lease and bond positions are kept as fractions of a
// bucket and the continuation value is interpolated between the two neighbouring buckets, so
// the bucketing is unbiased: an instalment of 1.2 buckets is never rounded to 1.
function step(m: Model, lb: number, bb: number, w: Weather, o: Offer, a: Action): { cash: number; lb: number; bb: number; ok: boolean } {
  const owed = lb * m.p.leaseStep, bond = bb * m.p.bondStep;
  if (a === "accept") {
    if (o === "none") return { cash: -Infinity, lb, bb, ok: false };
    const rate = m.listed(bb) ? round(m.p.leaseRate - LISTED_RATE_CUT) : m.p.leaseRate;
    const r = week(o, w, owed, DEMO.bondMin - bond, rate, m.p);
    if (!r.eligible) return { cash: -Infinity, lb, bb, ok: false };
    return { cash: r.cash, lb: Math.max(0, (owed - r.instalment) / m.p.leaseStep), bb: Math.min(m.BB - 1, (bond + r.bondFill) / m.p.bondStep), ok: true };
  }
  return { cash: a === "decline" ? -FIXED_PER_WEEK : -IDLE_PER_WEEK, lb, bb, ok: true };
}

// Value iteration backwards from the last week. V[w] holds the best expected cash from week w
// to the end for every state at week w.
export function solve(params: Partial<MdpParams> = {}): Solution {
  const p = { ...DEFAULTS, ...params };
  const m = model(p);
  const H = p.horizon;
  const table = new Uint8Array(H * m.perWeek);
  let next = new Float64Array(m.perWeek); // V[w + 1], zero after the horizon
  const dists: Record<string, number[]> = {};
  const dist = (wk: number, wx: Weather, listed: boolean, cold: boolean) => {
    const key = `${wk}|${wx}|${listed}|${cold}`;
    return (dists[key] ??= offerDistribution(wk, H, wx, listed, cold));
  };
  // Expected continuation value at week wk + 1 from whole lease and bond buckets after an action.
  const futureAt = (wk: number, lb: number, bb: number, cold: boolean): number => {
    const wet = wetProbability(wk + 1, H);
    let v = 0;
    for (let wi = 0; wi < WEATHERS.length; wi++) {
      const pw = wi === 1 ? wet : 1 - wet;
      const d = dist(wk + 1, WEATHERS[wi], m.listed(bb), cold);
      for (let oi = 0; oi < OFFERS.length; oi++) v += pw * d[oi] * next[m.idx(lb, bb, wi, oi)];
    }
    return v;
  };
  // Fractional positions interpolate between the neighbouring buckets on each axis.
  const future = (wk: number, lb: number, bb: number, cold: boolean): number => {
    if (wk + 1 >= H) return 0;
    const l0 = Math.min(m.LB - 1, Math.floor(lb)), l1 = Math.min(m.LB - 1, l0 + 1), lw = lb - l0;
    const b0 = Math.min(m.BB - 1, Math.floor(bb)), b1 = Math.min(m.BB - 1, b0 + 1), bw = bb - b0;
    const at = (l: number, b: number) => futureAt(wk, l, b, cold);
    return (1 - lw) * ((1 - bw) * at(l0, b0) + bw * at(l0, b1)) + lw * ((1 - bw) * at(l1, b0) + bw * at(l1, b1));
  };
  const counts: Record<Action, number> = { accept: 0, decline: 0, idle: 0 };
  for (let wk = H - 1; wk >= 0; wk--) {
    const cur = new Float64Array(m.perWeek);
    for (let lb = 0; lb < m.LB; lb++) for (let bb = 0; bb < m.BB; bb++) for (let wi = 0; wi < WEATHERS.length; wi++) for (let oi = 0; oi < OFFERS.length; oi++) {
      let best = -Infinity, bestA = 1;
      for (let ai = 0; ai < ACTIONS.length; ai++) {
        const s = step(m, lb, bb, WEATHERS[wi], OFFERS[oi], ACTIONS[ai]);
        if (!s.ok) continue;
        const v = s.cash + future(wk, s.lb, s.bb, ACTIONS[ai] === "idle");
        if (v > best) { best = v; bestA = ai; }
      }
      const i = m.idx(lb, bb, wi, oi);
      cur[i] = best; table[wk * m.perWeek + i] = bestA;
      counts[ACTIONS[bestA]] += 1;
    }
    next = cur;
  }
  const policy: PolicyTable = {
    table, states: H * m.perWeek, counts,
    at: (wk, owed, bond, weather, offer) => {
      const lb = Math.min(m.LB - 1, Math.max(0, Math.round(owed / p.leaseStep)));
      const bb = Math.min(m.BB - 1, Math.max(0, Math.round(bond / p.bondStep)));
      return ACTIONS[table[Math.min(H - 1, Math.max(0, wk)) * m.perWeek + m.idx(lb, bb, WEATHERS.indexOf(weather), OFFERS.indexOf(offer))]];
    },
  };
  // Expected profit from the start state: the week 0 weather and offer are still random.
  const lb0 = Math.min(m.LB - 1, Math.round(p.leaseBalance / p.leaseStep));
  const wet0 = wetProbability(0, H);
  let expectedProfit = 0;
  for (let wi = 0; wi < WEATHERS.length; wi++) {
    const d = dist(0, WEATHERS[wi], false, false);
    for (let oi = 0; oi < OFFERS.length; oi++) expectedProfit += (wi === 1 ? wet0 : 1 - wet0) * d[oi] * next[m.idx(lb0, 0, wi, oi)];
  }
  const comparison = compare(p, policy);
  return { policy, expectedProfit: round(expectedProfit), weeksToTitle: comparison.mdp.weeksToTitle, titleShare: comparison.mdp.titleShare, comparison, params: p, states: H * m.perWeek };
}

export type Rule = (wk: number, owed: number, bond: number, weather: Weather, offer: Offer) => Action;

// The greedy rule the wallet uses today: take whatever clears the floor, otherwise stand by.
export function greedy(p: Pick<MdpParams, "reserveRule" | "minMarginPerMu" | "leaseRate">): Rule {
  return (_wk, owed, bond, weather, offer) => {
    if (offer === "none") return "decline";
    const rate = bond >= DEMO.bondMin ? round(p.leaseRate - LISTED_RATE_CUT) : p.leaseRate;
    return week(offer, weather, owed, DEMO.bondMin - bond, rate, p).eligible ? "accept" : "decline";
  };
}

// Seeded seasons on the same demand model. Season k uses seed + k for every rule, so two rules
// see the same weather and the same offers (common random numbers) and differ only in choices.
export function simulate(rule: Rule, p: MdpParams): SeasonStats {
  const profits: number[] = [];
  const titles: number[] = [];
  const pick = (r: () => number, d: number[]) => { const u = r(); let c = 0; for (let i = 0; i < d.length; i++) { c += d[i]; if (u < c) return i; } return d.length - 1; };
  for (let k = 0; k < p.seasons; k++) {
    const r = rng(p.seed + k);
    let owed = p.leaseBalance, bond = 0, cash = 0, cold = false, title: number | null = null;
    for (let wk = 0; wk < p.horizon; wk++) {
      const weather: Weather = r() < wetProbability(wk, p.horizon) ? "wet" : "dry";
      const offer = OFFERS[pick(r, offerDistribution(wk, p.horizon, weather, bond >= DEMO.bondMin, cold))];
      const a = rule(wk, owed, bond, weather, offer);
      cold = a === "idle";
      if (a === "accept" && offer !== "none") {
        const rate = bond >= DEMO.bondMin ? round(p.leaseRate - LISTED_RATE_CUT) : p.leaseRate;
        const o = week(offer, weather, owed, DEMO.bondMin - bond, rate, p);
        if (o.eligible) { cash += o.cash; owed = round(owed - o.instalment); bond = round(bond + o.bondFill); }
        else cash -= FIXED_PER_WEEK;
      } else cash -= a === "idle" ? IDLE_PER_WEEK : FIXED_PER_WEEK;
      if (owed <= 0 && title === null) title = wk + 1;
    }
    profits.push(round(cash));
    if (title !== null) titles.push(title);
  }
  const v = variance(profits);
  return { meanProfit: round(mean(profits)), variance: round(v), sd: round(Math.sqrt(v)), titleShare: round(titles.length / p.seasons), weeksToTitle: titles.length ? round(mean(titles)) : null, seasons: p.seasons };
}

export function compare(p: MdpParams, policy: PolicyTable): Comparison {
  const mdp = simulate((wk, owed, bond, w, o) => policy.at(wk, owed, bond, w, o), p);
  const g = simulate(greedy(p), p);
  return { mdp, greedy: g, seed: p.seed, seasons: p.seasons, advantage: round(mdp.meanProfit - g.meanProfit) };
}

let memo: Solution | null = null;
export function cached(): Solution {
  return (memo ??= solve());
}
