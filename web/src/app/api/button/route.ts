import { RUNS } from "@/engine/scenarios";
import { sign, ADDR } from "@/engine/agents";
import { allow, ipOf, tooMany } from "@/engine/ratelimit";
import type { EngineEvent, Side } from "@/engine/types";
import { pickLang, tr } from "@/engine/i18n";
import { demoAuthorised } from "@/engine/chain";

export const dynamic = "force-dynamic";

// The hard button. The only path that signs with the operator key. The policy engine still
// evaluates the intent (tier L3), the bond contract records the top up. The minimum is a
// reward threshold: reaching it unlocks a better lease rate, it never blocks work.
// The button signs as the operator and can raise perTxCap on a running scenario, so it needs the
// same demo token as real chain mode (x-zishi-demo equal to DEMO_TOKEN; no token set, always 401).
export async function POST(req: Request) {
  if (!allow(ipOf(req))) return tooMany();
  if (!demoAuthorised(req.headers)) return Response.json({ error: "demo token required for the operator button" }, { status: 401 });
  const { what, amount, scenario, lang: rawLang } = (await req.json()) as { what: "top_up" | "set_cap"; amount: number; scenario: Side; lang?: string };
  const lang = pickLang(rawLang);
  const run = RUNS.get(scenario);
  if (!run) return Response.json({ error: "no run for that scenario on this server, start one first" }, { status: 404 });
  if (what !== "top_up" && what !== "set_cap") return Response.json({ error: "unknown action" }, { status: 400 });
  const amt = Number(amount);
  const { bond, chain, policy, m } = run;
  const now = () => Date.now();
  const events: EngineEvent[] = [];
  const emitM = (): EngineEvent => ({ t: "machine", state: { ...m, position: { ...m.position } }, at: now() });

  const intent = await sign("operator", what, { amount: amt });
  events.push({ t: "intent", intent, at: now() });
  const decision = await policy.evaluate(intent);
  events.push({ t: "policy", decision, at: now() });
  if (decision.verdict !== "allow") {
    events.push({ t: "button", waiting: true, what, at: now() });
    return Response.json({ events });
  }
  if (what === "top_up") {
    const tx = await bond.topUp(ADDR.operator, amt);
    m.bond = bond.balance;
    events.push({ t: "chain", tx, at: now() });
    const confirmed = await chain.confirm(tx);
    events.push({ t: "chain", tx: confirmed, at: now() });
    events.push({ t: "chain", tx: await chain.finalise(confirmed), at: now() });
    const text = bond.balance >= bond.min
      ? tr(lang, "b.atMin", { bal: bond.balance, min: bond.min })
      : tr(lang, "b.short", { bal: bond.balance, gap: Math.round((bond.min - bond.balance) * 100) / 100, min: bond.min });
    events.push({ t: "agent.message", from: "lender", to: "machine", text, untrusted: false, source: "template", grounded: true, at: now() });
  } else {
    policy.policy = { ...policy.policy, perTxCap: amt };
    events.push({ t: "narration", text: tr(lang, "b.cap", { amt }), at: now() });
  }
  events.push(emitM());
  events.push({ t: "button", waiting: false, what, at: now() });
  return Response.json({ events });
}
