// Runnable check: every attack must be blocked, and a normal flow must pass.
import { runAll } from "./attacks";
import { PolicyEngine, DEFAULT_POLICY } from "./policy";
import { sign } from "./agents";

const results = runAll();
const failed = results.filter(r => !r.blocked);
const normal = new PolicyEngine().evaluate(sign("machine", "pay_instalment", { payee: DEFAULT_POLICY.allowlist.lender, amount: 7.2 }), { reference: 7.2, fee: 18 });
console.table(results.map(r => ({ id: r.id, layer: r.layer, blocked: r.blocked, detail: r.detail.slice(0, 60) })));
if (failed.length) { console.error("attacks not blocked:", failed.map(f => f.id)); process.exit(1); }
if (normal.verdict !== "allow") { console.error("normal instalment was blocked", normal); process.exit(1); }
console.log("ok: 20 of 20 attacks blocked, normal instalment allowed");
