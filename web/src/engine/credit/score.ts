// A pilot credit score in the Buhlmann credibility style insurers use to price a policy:
// the estimate is a weighted mix of the fleet's experience and the pilot's own, and the
// weight on the pilot's own record, the credibility Z = n / (n + k), grows with the jobs
// seen. With a Beta prior and Bernoulli outcomes that mix is exactly the Beta posterior
// mean, so each component is one Beta that gains a success or a failure per job.
//
// Three components, each with a fleet prior: that a job ends confirmed, that the instalment
// due on it is paid on time, and that the flight log and the signed intents stay clean (no
// hold, no slash). The score p is their weighted mean; the tier and the recommended
// instalment share follow from p. Nothing here moves money: the rate is a recommendation
// the lender reads, inside the band the policy already allows.

export type CreditOutcome = "confirmed" | "held" | "slashed" | "missed";
export type Tier = "A" | "B" | "C" | "D";

export interface CreditPrior { confirm: number; instalment: number; held: number; strength: number }
export interface Beta { a: number; b: number }
export interface CreditState { prior: CreditPrior; confirm: Beta; instalment: Beta; clean: Beta; n: number; last?: CreditOutcome }
export interface CreditScore { p: number; credibility: number; n: number; tier: Tier; parts: { confirm: number; instalment: number; clean: number } }

// Fleet rates behind the prior and its strength k in jobs: a new pilot's own record counts
// as much as the fleet's once they have seen k jobs.
export const FLEET_PRIOR: CreditPrior = { confirm: 0.9, instalment: 0.92, held: 0.08, strength: 8 };
export const WEIGHTS = { confirm: 0.4, instalment: 0.3, clean: 0.3 } as const;
export const TIERS: [Tier, number][] = [["A", 0.92], ["B", 0.85], ["C", 0.7], ["D", 0]];
// The score at which the recommended share sits at the top of the band, and at the bottom.
export const RATE_P = { top: 0.7, bottom: 0.97 } as const;

const beta = (mean: number, k: number): Beta => ({ a: mean * k, b: (1 - mean) * k });
const mean = (b: Beta) => b.a / (b.a + b.b);
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export function newState(prior: CreditPrior = FLEET_PRIOR): CreditState {
  return { prior, confirm: beta(prior.confirm, prior.strength), instalment: beta(prior.instalment, prior.strength), clean: beta(1 - prior.held, prior.strength), n: 0 };
}

// One outcome, one trial on each component it says something about. A held log is a failed
// confirmation and an unclean record but no instalment trial, since nothing was due. A slash
// is a proof against a signed intent, so it only touches the clean record.
export function update(state: CreditState, outcome: CreditOutcome): CreditState {
  const hit = (b: Beta, ok: boolean): Beta => (ok ? { a: b.a + 1, b: b.b } : { a: b.a, b: b.b + 1 });
  const s: CreditState = { ...state, n: state.n + 1, last: outcome };
  switch (outcome) {
    case "confirmed": return { ...s, confirm: hit(s.confirm, true), instalment: hit(s.instalment, true), clean: hit(s.clean, true) };
    case "held": return { ...s, confirm: hit(s.confirm, false), clean: hit(s.clean, false) };
    case "slashed": return { ...s, clean: hit(s.clean, false) };
    case "missed": return { ...s, instalment: hit(s.instalment, false) };
  }
}

export function score(state: CreditState): CreditScore {
  const parts = { confirm: mean(state.confirm), instalment: mean(state.instalment), clean: mean(state.clean) };
  const p = WEIGHTS.confirm * parts.confirm + WEIGHTS.instalment * parts.instalment + WEIGHTS.clean * parts.clean;
  const tier = TIERS.find(([, floor]) => p >= floor)![0];
  return { p: r3(p), credibility: r3(state.n / (state.n + state.prior.strength)), n: state.n, tier, parts: { confirm: r3(parts.confirm), instalment: r3(parts.instalment), clean: r3(parts.clean) } };
}

// Where in the policy's rate band the instalment share should sit: at the top for a score of
// RATE_P.top or below, sliding to the bottom at RATE_P.bottom. A better pilot keeps more of
// each fee; the band itself is the lender's, the score only moves inside it.
export function rateFor(s: CreditScore, band: [number, number]): { rate: number; rateBps: number; lo: number; hi: number } {
  const [lo, hi] = band;
  const u = Math.max(0, Math.min(1, (s.p - RATE_P.top) / (RATE_P.bottom - RATE_P.top)));
  const rate = hi - (hi - lo) * u;
  return { rate: Math.round(rate * 10000) / 10000, rateBps: Math.round(rate * 10000), lo, hi };
}
