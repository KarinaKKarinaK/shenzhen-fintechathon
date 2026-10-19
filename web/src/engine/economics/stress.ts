// Monte Carlo stress test of the two bonds, the bank risk method. 2000 seeded seasons on the
// same weather and demand model as the MDP, with random tamper attempts caught at the anomaly
// model's measured detection rate, random agent mistakes that slash the vendor bond, and random
// instalment skips. Three skips in a season is a default. The lender's loss given default is
// what is owed less the resale value of the drone, with and without the two bonds absorbing
// the first loss. Every figure is yuan on fixed seeds; nothing here is a forecast.

import { DEMO } from "../policy";
import { METRICS as PLAUS } from "../ml/plausibility";
import { JOBS_PER_WEEK, OFFERS, greedy, offerDistribution, week, wetProbability, type Offer, type Weather } from "./mdp";
import { mean, quantile, rng, round } from "./rng";

export interface StressParams {
  seed: number;
  seasons: number;
  horizon: number;
  leaseBalance: number;
  tamperPerJob: number; // chance a job's flight log is tampered
  mistakePerDay: number; // chance per day of a proven agent violation against the vendor bond
  skipPerWeek: number; // chance a working week's instalment is skipped
  skipsToDefault: number; // the lender's covenant
  resaleShare: number; // resale value of the drone as a share of cost at week 0
  resaleDecayPerWeek: number;
}

export const DEFAULTS: StressParams = {
  seed: 9001, seasons: 2000, horizon: 26, leaseBalance: DEMO.droneCost,
  tamperPerJob: 0.02, mistakePerDay: 0.01, skipPerWeek: 0.05, skipsToDefault: 3, resaleShare: 0.55, resaleDecayPerWeek: 0.005,
};

export interface StressSummary {
  seed: number;
  seasons: number;
  horizon: number;
  detectionRate: number; // the anomaly model's measured rate, used for caught tampers
  defaultProbability: number;
  pilotBondBelowMinAfterReaching: number; // P(bond falls below the minimum | it reached the minimum)
  pilotBondBelowMinAtEnd: number;
  pilotBondReachedMin: number;
  expectedVendorDrawdown: number; // yuan slashed from the vendor bond per season
  maxVendorDrawdown: number;
  expectedPilotSlashes: number; // yuan per season
  lgdWithoutBonds: { mean: number; p95: number };
  lgdWithBonds: { mean: number; p95: number };
  bondCover: number; // share of the p95 loss the bonds absorb
  currency: "CNY";
}

const DAYS = 7;

export function run(seed = DEFAULTS.seed, params: Partial<StressParams> = {}): StressSummary {
  const p = { ...DEFAULTS, ...params, seed };
  const rule = greedy({ reserveRule: DEMO.reserveRule, minMarginPerMu: 0, leaseRate: DEMO.leaseRate });
  const pick = (r: () => number, d: number[]) => { const u = r(); let c = 0; for (let i = 0; i < d.length; i++) { c += d[i]; if (u < c) return i; } return d.length - 1; };
  let defaults = 0, reached = 0, fellAfterReaching = 0, belowAtEnd = 0;
  const vendorDraw: number[] = [], pilotDraw: number[] = [], lgdBare: number[] = [], lgdBonded: number[] = [];
  for (let k = 0; k < p.seasons; k++) {
    const r = rng(p.seed + k);
    let owed = p.leaseBalance, bond = 0, vendor = DEMO.vendorBond, arrears = 0, skips = 0, cold = false;
    let everReached = false, fell = false, slashedPilot = 0, defaulted = false;
    for (let wk = 0; wk < p.horizon && !defaulted; wk++) {
      const weather: Weather = r() < wetProbability(wk, p.horizon) ? "wet" : "dry";
      const offer: Offer = OFFERS[pick(r, offerDistribution(wk, p.horizon, weather, bond >= DEMO.bondMin, cold))];
      const a = rule(wk, owed, bond, weather, offer);
      cold = a === "idle";
      if (a === "accept" && offer !== "none") {
        const rate = bond >= DEMO.bondMin ? round(DEMO.leaseRate - 0.05) : DEMO.leaseRate;
        const o = week(offer, weather, owed, DEMO.bondMin - bond, rate, { reserveRule: DEMO.reserveRule, minMarginPerMu: 0 });
        bond = round(bond + o.bondFill);
        if (r() < p.skipPerWeek) { skips += 1; arrears = round(arrears + o.instalment); }
        else owed = round(owed - o.instalment);
        // Tamper attempts on this week's flight logs, caught at the measured detection rate.
        for (let j = 0; j < JOBS_PER_WEEK[weather]; j++) {
          if (r() < p.tamperPerJob && r() < PLAUS.detectionRate) {
            const s = Math.min(DEMO.pilotSlash, bond);
            bond = round(bond - s); slashedPilot = round(slashedPilot + s);
          }
        }
      }
      // Agent mistakes against the vendor bond, with the contract's daily cap.
      for (let d = 0; d < DAYS; d++) {
        let today = 0;
        while (r() < p.mistakePerDay && today + DEMO.vendorPenalty <= DEMO.vendorDailyCap) {
          const s = Math.min(DEMO.vendorPenalty, vendor);
          vendor = round(vendor - s); today += s;
        }
      }
      if (bond >= DEMO.bondMin) everReached = true;
      else if (everReached) fell = true;
      if (skips >= p.skipsToDefault) {
        defaulted = true;
        const resale = round(p.leaseBalance === DEMO.droneCost ? DEMO.droneCost * p.resaleShare * (1 - p.resaleDecayPerWeek * wk) : owed * p.resaleShare);
        const exposure = Math.max(0, round(owed + arrears - resale));
        lgdBare.push(exposure);
        lgdBonded.push(Math.max(0, round(exposure - bond - vendor)));
      }
    }
    if (defaulted) defaults += 1;
    if (everReached) reached += 1;
    if (fell) fellAfterReaching += 1;
    if (bond < DEMO.bondMin) belowAtEnd += 1;
    vendorDraw.push(round(DEMO.vendorBond - vendor));
    pilotDraw.push(slashedPilot);
  }
  const p95Bare = quantile(lgdBare, 0.95), p95Bonded = quantile(lgdBonded, 0.95);
  return {
    seed: p.seed, seasons: p.seasons, horizon: p.horizon, detectionRate: PLAUS.detectionRate,
    defaultProbability: round(defaults / p.seasons),
    pilotBondBelowMinAfterReaching: reached ? round(fellAfterReaching / reached) : 0,
    pilotBondBelowMinAtEnd: round(belowAtEnd / p.seasons),
    pilotBondReachedMin: round(reached / p.seasons),
    expectedVendorDrawdown: round(mean(vendorDraw)), maxVendorDrawdown: Math.max(0, ...vendorDraw),
    expectedPilotSlashes: round(mean(pilotDraw)),
    lgdWithoutBonds: { mean: round(mean(lgdBare)), p95: p95Bare },
    lgdWithBonds: { mean: round(mean(lgdBonded)), p95: p95Bonded },
    bondCover: p95Bare > 0 ? round((p95Bare - p95Bonded) / p95Bare) : 0,
    currency: "CNY",
  };
}

let memo: StressSummary | null = null;
export function cached(): StressSummary {
  return (memo ??= run());
}
