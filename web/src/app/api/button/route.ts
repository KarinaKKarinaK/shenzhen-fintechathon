import { RUNS } from "@/engine/scenarios";
import { sign, ADDR } from "@/engine/agents";
import { allow, ipOf, tooMany } from "@/engine/ratelimit";
import type { EngineEvent, Side } from "@/engine/types";

export const dynamic = "force-dynamic";

// The hard button. The only path that signs with the operator key. The policy engine still
// evaluates the intent (tier L3), the bond contract mines the top up, the lender unfreezes.
export async function POST(req: Request) {
  if (!allow(ipOf(req))) return tooMany();
  const { what, amount, scenario } = (await req.json()) as { what: "top_up" | "set_cap"; amount: number; scenario: Side };
  const run = RUNS.get(scenario);
  if (!run) return Response.json({ error: "no run for that scenario on this server, start one first" }, { status: 404 });
  if (what !== "top_up" && what !== "set_cap") return Response.json({ error: "unknown action" }, { status: 400 });
  const amt = Number(amount);
  const { bond, lease, policy, m } = run;
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
    if (bond.balance >= bond.min && lease.frozen) {
      lease.frozen = false;
      m.status = "idle";
      events.push({ t: "agent.message", from: "lender", to: "machine", text: `Bond ${bond.balance} is back above minimum ${bond.min}. Lease unfrozen.`, untrusted: false, source: "template", grounded: true, at: now() });
    } else if (bond.balance < bond.min) {
      events.push({ t: "agent.message", from: "lender", to: "machine", text: `Bond ${bond.balance} is still below minimum ${bond.min}. Lease stays frozen.`, untrusted: false, source: "template", grounded: true, at: now() });
    }
  } else {
    policy.policy = { ...policy.policy, perTxCap: amt };
    events.push({ t: "narration", text: `Per transaction cap set to ${amt} by the operator key.`, at: now() });
  }
  events.push(emitM());
  events.push({ t: "button", waiting: false, what, at: now() });
  return Response.json({ events });
}
