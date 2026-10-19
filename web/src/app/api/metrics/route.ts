// Every number here is computed at module load or request time from fixed held out sets the
// agent cannot edit: the classifier's held out quarter, the anomaly model's held out quarter,
// the ratchet's frozen week. Nothing is typed in. drift is the live state of the two CUSUM
// monitors plus the detection delay measured on seeded synthetic scores at load.
import { METRICS as gate } from "@/engine/ml/gate";
import { METRICS as plausibility } from "@/engine/ml/plausibility";
import { cached } from "@/engine/ratchet";
import { realChainFunded } from "@/engine/chain";
import { hasKey } from "@/engine/model";
import { driftState } from "@/engine/drift/monitor";
import { getEconomicsMetrics } from "@/engine/economics";
import { DEFAULT_POLICY } from "@/engine/policy";
import { newState, rateFor, score as creditScore, update as creditUpdate, type CreditOutcome } from "@/engine/credit/score";

export const dynamic = "force-dynamic";

// The credit score on one fixed sequence, the same one selfcheck asserts on: the fleet prior,
// three confirmed jobs, one held log. Deterministic, no randomness, so it is computed per request.
const CREDIT_SEQUENCE: CreditOutcome[] = ["confirmed", "confirmed", "confirmed", "held"];
function creditMetrics() {
  let state = newState();
  const path = [creditScore(state).p];
  for (const o of CREDIT_SEQUENCE) { state = creditUpdate(state, o); path.push(creditScore(state).p); }
  const s = creditScore(state);
  const rate = rateFor(s, DEFAULT_POLICY.rateBand);
  return { sequence: CREDIT_SEQUENCE, path, p: s.p, tier: s.tier, credibility: s.credibility, n: s.n, parts: s.parts, rateBps: rate.rateBps, bandBps: [Math.round(rate.lo * 10000), Math.round(rate.hi * 10000)], prior: state.prior, note: "Buhlmann credibility: a Beta posterior per component, weight on the pilot's own record n / (n + k)" };
}

export async function GET() {
  const r = cached(60);
  // Every value is fixed by seed except chain, model and the live drift state, which move slowly,
  // so the CDN may hold a copy for a minute and serve it while a fresh one is computed.
  return Response.json({
    gate,
    plausibility,
    conformal: { threshold: plausibility.conformalThreshold, targetFalseAlarm: plausibility.targetFalseAlarm, achievedFalseAlarm: plausibility.achievedFalseAlarm, coverage: plausibility.coverage, calibrationN: plausibility.calibrationN },
    economics: getEconomicsMetrics(),
    credit: creditMetrics(),
    ratchet: { baselineProfit: r.baselineProfit, bestProfit: r.bestProfit, steps: r.steps.length, kept: r.steps.filter((s) => s.kept).length, best: r.best, baseline: r.baseline, evalSeed: r.evalSeed, walkSeed: r.walkSeed },
    planner: { method: "knapsack" as const },
    drift: driftState(),
    chain: (await realChainFunded()).funded ? "real" : "sim",
    model: hasKey() ? "real" : "scripted",
    computedAt: new Date().toISOString(),
    note: "held out: every metric is measured on data split off by a fixed seed before training, never on the training rows; drift state is live, its evalDelay is from seeded synthetic scores",
  }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
