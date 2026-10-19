// A sealed bid second price auction for planning priority, after Vickrey. When two candidate
// jobs contend for the same flying time, each job's bid is its margin per mu as the wallet
// computes it, the higher bid flies first, and the price it pays in priority is the runner
// up's bid, not its own. Under second pricing the best bid for a job is its true margin: a
// farmer who inflates a stated fee can buy the slot, but only at the rival's margin, and
// loses money on the deal whenever the inflation is what won it. The plan is therefore
// truthful about margin and a stated fee cannot buy priority it did not earn.

import { round } from "./rng";

export interface Bid { id: string; bid: number; mu?: number }
export interface AuctionResult { winner: string; runnerUp: string | null; price: number; bids: Bid[] }
export interface Contender { minutes: number; windowMin: number }

// Two jobs contend when both cannot be flown inside the tighter of their two windows.
export function contend(a: Contender, b: Contender): boolean {
  return a.minutes + b.minutes > Math.min(a.windowMin, b.windowMin);
}

// Highest bid wins and pays the second highest. Equal bids: the larger job first (more work
// secured per decision), then the id, so the result is fixed for a fixed input.
export function secondPrice(bids: Bid[]): AuctionResult {
  if (!bids.length) throw new Error("auction with no bids");
  const order = [...bids].sort((a, b) => b.bid - a.bid || (b.mu ?? 0) - (a.mu ?? 0) || a.id.localeCompare(b.id));
  const [w, r] = order;
  return { winner: w.id, runnerUp: r?.id ?? null, price: round(r ? r.bid : w.bid), bids: order };
}

// The payoff of a bidder with a true margin of `value` who bids `bid` against the others.
// Wins when the bid tops every other, pays the best other bid; otherwise gets nothing.
export function utility(value: number, bid: number, others: number[]): number {
  const top = Math.max(...others);
  return bid > top ? round(value - top) : 0;
}

export interface InflationCheck { honest: AuctionResult; inflated: AuctionResult; honestUtility: number; inflatedUtility: number; truthful: boolean }

// The fixed example: a rice job at 4.2 yuan margin per mu against a maize job at 3.5. Honest
// bids: rice flies first at a price of 3.5. The maize farmer inflates the stated fee until the
// bid reads 5: maize wins, but pays 4.2 on a job worth 3.5, so the lie costs 0.7 per mu.
export function inflationCheck(): InflationCheck {
  const rice: Bid = { id: "rice", bid: 4.2, mu: 60 };
  const maize: Bid = { id: "maize", bid: 3.5, mu: 20 };
  const honest = secondPrice([rice, maize]);
  const inflated = secondPrice([rice, { ...maize, bid: 5 }]);
  const honestUtility = utility(maize.bid, maize.bid, [rice.bid]);
  const inflatedUtility = utility(maize.bid, 5, [rice.bid]);
  return { honest, inflated, honestUtility, inflatedUtility, truthful: honestUtility >= inflatedUtility };
}
