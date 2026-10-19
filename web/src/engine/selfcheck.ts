// Runnable check: every attack must be blocked, every real scenario message must pass the gate,
// a normal instalment must be allowed, and the model layer must have no reach into keys or chain.
import fs from "node:fs";
import path from "node:path";
import { runAll, runBenign, ATTACKS } from "./attacks";
import { PolicyEngine, DEFAULT_POLICY } from "./policy";
import { sign } from "./agents";
import { frame, PREAMBLE } from "./framing";

async function main() {
  const results = await runAll();
  const failed = results.filter((r) => !r.blocked);
  const benign = runBenign();
  const naiveFell = results.filter((r) => r.naive === "fell").length;
  const normal = await new PolicyEngine(DEFAULT_POLICY, "selfcheck").evaluate(await sign("machine", "pay_instalment", { payee: DEFAULT_POLICY.allowlist.lender, amount: 7.2 }), { reference: 7.2, fee: 18 });

  console.table(results.map((r) => ({ id: r.id, layer: r.layer, standard: r.standard, blocked: r.blocked, naive: r.naive, detail: r.detail.slice(0, 50) })));
  if (failed.length) { console.error("attacks not blocked:", failed.map((f) => f.id)); process.exit(1); }
  if (benign.failed.length) { console.error("benign messages not passing:", benign.failed); process.exit(1); }
  if (normal.verdict !== "allow") { console.error("normal instalment was blocked", normal); process.exit(1); }
  if (!frame("x", "counterparty", "hi").startsWith(PREAMBLE)) { console.error("frame does not start with the preamble"); process.exit(1); }

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
