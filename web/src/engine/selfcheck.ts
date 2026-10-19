// Runnable check: every attack must be blocked, every real scenario message must pass the gate,
// a normal instalment must be allowed, every slash rule must have a contract case, the removed
// rules must have none, and the model layer must have no reach into keys or chain.
import fs from "node:fs";
import path from "node:path";
import { runAll, runBenign, ATTACKS } from "./attacks";
import { PolicyEngine, DEFAULT_POLICY } from "./policy";
import { SLASH_RULES } from "./contracts";
import { sign } from "./agents";
import { frame, PREAMBLE } from "./framing";

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
