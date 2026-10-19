import { RUNS } from "@/engine/scenarios";
import { sign, ADDR } from "@/engine/agents";
import { allow, ipOf, tooMany } from "@/engine/ratelimit";
import type { EngineEvent, Side } from "@/engine/types";

export const dynamic = "force-dynamic";

// The hard button. The only path that signs with the operator key. The policy engine still
// evaluates the intent (tier L3), the bond contract records the top up. The minimum is a
// reward threshold: reaching it unlocks a better lease rate, it never blocks work.
export async function POST(req: Request) {
  if (!allow(ipOf(req))) return tooMany();
  const { what, amount, scenario } = (await req.json()) as { what: "top_up" | "set_cap"; amount: number; scenario: Side };
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
      ? `Pilot bond ${bond.balance} yuan is at the minimum of ${bond.min} yuan. Better lease rate and main board listing unlocked.`
      : `Pilot bond ${bond.balance} yuan, ${Math.round((bond.min - bond.balance) * 100) / 100} yuan short of the ${bond.min} yuan minimum. Work continues either way.`;
    events.push({ t: "agent.message", from: "lender", to: "machine", text, untrusted: false, source: "template", grounded: true, at: now() });
  } else {
    policy.policy = { ...policy.policy, perTxCap: amt };
    events.push({ t: "narration", text: `Per transaction cap set to ${amt} yuan by the operator key.`, at: now() });
  }
  events.push(emitM());
  events.push({ t: "button", waiting: false, what, at: now() });
  return Response.json({ events });
}
