// Runnable check: every attack must be blocked, every real scenario message must pass the gate,
// a normal instalment must be allowed, every slash rule must have a contract case, the removed
// rules must have none, and the model layer must have no reach into keys or chain.
import fs from "node:fs";
import path from "node:path";
import { runAll, runBenign, ATTACKS } from "./attacks";
import { PolicyEngine, DEFAULT_POLICY, DEMO } from "./policy";
import { SLASH_RULES } from "./contracts";
import { sign, economics } from "./agents";
import { frame, PREAMBLE } from "./framing";
import { METRICS as GATE } from "./ml/gate";
import { METRICS as PLAUS } from "./ml/plausibility";
import { run } from "./ratchet";
import { honestLog, plausible } from "./oracle";
import { plan } from "./planner";

async function main() {
  const results = await runAll();
  const failed = results.filter((r) => !r.blocked);
  const benign = runBenign();
  const naiveFell = results.filter((r) => r.naive === "fell").length;
  const normal = await new PolicyEngine(DEFAULT_POLICY, "selfcheck").evaluate(await sign("machine", "pay_instalment", { jobId: "job-201", payee: DEFAULT_POLICY.allowlist.lender, amount: 96 }), { reference: 96, fee: 240 });

  console.table(results.map((r) => ({ id: r.id, layer: r.layer, standard: r.standard, blocked: r.blocked, naive: r.naive, detail: r.detail.slice(0, 50) })));
  if (failed.length) { console.error("attacks not blocked:", failed.map((f) => f.id)); process.exit(1); }
  if (benign.failed.length) { console.error("benign messages not passing:", benign.failed); process.exit(1); }
  if (normal.verdict !== "allow") { console.error("normal instalment was blocked", normal); process.exit(1); }
  if (!frame("x", "counterparty", "hi").startsWith(PREAMBLE)) { console.error("frame does not start with the preamble"); process.exit(1); }

  // Rule coverage: every slash rule has a contract case, the removed rules have none anywhere.
  const attacksSrc = fs.readFileSync(path.join(__dirname, "attacks.ts"), "utf8");
  const uncovered = SLASH_RULES.filter((r) => !attacksSrc.includes(`"${r}"`));
  if (uncovered.length) { console.error("slash rules without a case:", uncovered); process.exit(1); }
  const engineSrc = fs.readdirSync(__dirname).filter((f) => f.endsWith(".ts") && f !== "selfcheck.ts").map((f) => fs.readFileSync(path.join(__dirname, f), "utf8")).join("\n");
  const removed = ["NoCoverBound", "UnconfirmedClaim", "coverBound", "bindCover"].filter((r) => engineSrc.includes(r));
  if (removed.length) { console.error("removed rules still referenced:", removed); process.exit(1); }
  console.log(`rules: ${SLASH_RULES.join(", ")} each have a contract case; cover and unconfirmed-claim rules are gone`);

  // Learned components, each measured on a held out set picked by a fixed seed.
  console.log("message classifier (held out):", GATE);
  console.log("telemetry anomaly model (held out):", PLAUS);
  const ratchet = run(60);
  console.log(`strategy ratchet: baseline ${ratchet.baselineProfit}, best ${ratchet.bestProfit} after ${ratchet.steps.length} steps, ${ratchet.steps.filter((s) => s.kept).length} kept`);
  if (GATE.accuracy < 0.9) { console.error("classifier accuracy below 0.9", GATE); process.exit(1); }
  if (PLAUS.detectionRate < 0.9) { console.error("anomaly detection rate below 0.9", PLAUS); process.exit(1); }
  if (PLAUS.falseAlarmRate > 0.1) { console.error("anomaly false alarm rate above 0.1", PLAUS); process.exit(1); }
  if (!(ratchet.bestProfit >= ratchet.baselineProfit)) { console.error("ratchet went backwards", ratchet); process.exit(1); }
  const honest = honestLog("job-201", 60);
  if (!honest.ok) { console.error("honest flight log flagged", honest); process.exit(1); }
  const faked = plausible("job-204", 2400, 400, 2, 50);
  if (faked.ok) { console.error("faked flight log not flagged", faked); process.exit(1); }
  const day = plan({ jobs: [{ id: "a", title: "a", fee: 240, mu: 60, distanceM: 300, windowMin: 480 }, { id: "b", title: "b", fee: 60, mu: 20, distanceM: 300, windowMin: 480 }], budgetMu: 55, charges: 2, dayMinutes: 480, eco: (fee, mu) => economics(fee, DEMO.leaseRate, mu * DEMO.energyPerMu, DEMO.reserveRule), reason: (k) => k });
  if (day.method !== "knapsack" || day.usedMu !== 60 || day.items.find((i) => i.jobId === "b")?.why !== "below") { console.error("planner result unexpected", day); process.exit(1); }

  // Architecture check: the model layer cannot reach keys, chain, contracts, policy or signing.
  const src = fs.readFileSync(path.join(__dirname, "model.ts"), "utf8");
  const banned = ["viem", "./chain", "./contracts", "./policy", "SURETY_PRIVATE_KEY", "sign(", "tools:"];
  const hit = banned.filter((b) => src.includes(b));
  if (hit.length) { console.error("model.ts reaches into:", hit); process.exit(1); }
  console.log("model layer: no key, no chain, no tools, no signing");

  console.log(`ok: ${results.length - failed.length} of ${ATTACKS.length} attacks blocked, gated wallet error rate ${(failed.length / ATTACKS.length * 100).toFixed(0)} percent`);
  console.log(`naive wallet fell to ${naiveFell} of ${ATTACKS.length}, error rate ${(naiveFell / ATTACKS.length * 100).toFixed(0)} percent`);
  console.log(`benign: ${benign.passed} of ${benign.total} real messages pass the gate, normal instalment allowed`);
}

main().catch((e) => { console.error(e); process.exit(1); });
