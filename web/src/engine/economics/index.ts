// The economics layer: a lease MDP, a second price auction for planning priority, and a Monte
// Carlo stress test of the bonds. Each is deterministic by seed. getEconomicsMetrics() is the
// one call the metrics route needs; the first call solves and simulates, later calls are memo.

import { cached as mdp, type Solution } from "./mdp";
import { inflationCheck, type InflationCheck } from "./pricing";
import { cached as stress, type StressSummary } from "./stress";

export interface EconomicsMetrics {
  mdp: {
    expectedProfit: number;
    weeksToTitle: number | null;
    titleShare: number;
    states: number;
    horizon: number;
    leaseBalance: number;
    seed: number;
    seasons: number;
    policy: Solution["policy"]["counts"];
    comparison: Solution["comparison"];
    note: string;
  };
  auction: InflationCheck & { note: string };
  stress: StressSummary & { note: string };
}

export function getEconomicsMetrics(): EconomicsMetrics {
  const s = mdp();
  return {
    mdp: {
      expectedProfit: s.expectedProfit, weeksToTitle: s.weeksToTitle, titleShare: s.titleShare, states: s.states,
      horizon: s.params.horizon, leaseBalance: s.params.leaseBalance, seed: s.params.seed, seasons: s.params.seasons,
      policy: s.policy.counts, comparison: s.comparison,
      note: "value iteration on a bucketed lease, bond, weather and offer state; both rules simulated on the same seeded seasons with common random numbers",
    },
    auction: { ...inflationCheck(), note: "second price: the higher margin per mu flies first and pays the runner up's bid in priority, so an inflated fee cannot buy a slot at a profit" },
    stress: { ...stress(), note: "seeded seasons under the greedy rule with tamper, mistake and skip shocks; loss given default is owed less resale, before and after the bonds absorb the first loss" },
  };
}

export { solve as solveMdp, compare as compareMdp, greedy as greedyRule, DEFAULTS as MDP_DEFAULTS } from "./mdp";
export { secondPrice, contend, utility, inflationCheck } from "./pricing";
export { run as runStress, DEFAULTS as STRESS_DEFAULTS } from "./stress";
