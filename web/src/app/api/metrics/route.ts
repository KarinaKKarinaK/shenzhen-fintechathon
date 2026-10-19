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

export const dynamic = "force-dynamic";

export async function GET() {
  const r = cached(60);
  return Response.json({
    gate,
    plausibility,
    ratchet: { baselineProfit: r.baselineProfit, bestProfit: r.bestProfit, steps: r.steps.length, kept: r.steps.filter((s) => s.kept).length, best: r.best, baseline: r.baseline, evalSeed: r.evalSeed, walkSeed: r.walkSeed },
    planner: { method: "knapsack" as const },
    drift: driftState(),
    chain: (await realChainFunded()).funded ? "real" : "sim",
    model: hasKey() ? "real" : "scripted",
    computedAt: new Date().toISOString(),
    note: "held out: every metric is measured on data split off by a fixed seed before training, never on the training rows; drift state is live, its evalDelay is from seeded synthetic scores",
  });
}
