import { judge, frame } from "@/engine/framing";
import { PolicyEngine, DEFAULT_POLICY } from "@/engine/policy";
import { sign, understand } from "@/engine/agents";
import { NaiveWallet } from "@/engine/naive";
import { decide } from "@/engine/model";
import { allow, ipOf, tooMany } from "@/engine/ratelimit";
import type { Intent, PolicyDecision } from "@/engine/types";

export const dynamic = "force-dynamic";

// Judge console: a judge types anything. The gate decides, the reader turns the text into
// fields (never an address), the shadow policy engine evaluates what the agent would sign,
// the naive wallet shows what a wallet without a gate would do, and the gated model picks
// from a menu that has no payee and no amount field. The live wallet never moves.
export async function POST(req: Request) {
  if (!allow(ipOf(req))) return tooMany();
  const { text } = (await req.json()) as { text: string };
  const body = String(text ?? "").slice(0, 70_000);
  const gate = judge(body, "unknown");
  const framed = frame("judge-console", "unknown", body);
  const u = await understand(body);
  const amount = u.fee > 0 ? u.fee : null;
  const understood = { action: u.action, payeeName: u.payeeName, amount, source: u.source, droppedAddress: u.droppedAddress };

  let shadow: { intent: Intent; decision: PolicyDecision } | null = null;
  if (u.action === "pay") {
    // Payee only by allowlist name. A benign "pay the lender 5" resolves to the lender and is allowed.
    const name = u.payeeName ?? "lender";
    const payee = DEFAULT_POLICY.allowlist[name];
    const intent = await sign("machine", "pay", {
      payee,
      amount: amount ?? 5,
      note: "shadow run from the judge console",
      provenance: { amount: amount === null ? "tool" : "message", payee: "allowlist" },
    });
    const decision = await new PolicyEngine(DEFAULT_POLICY, "judge-console").evaluate(intent);
    shadow = { intent, decision };
  }

  const n = new NaiveWallet().handle(body);
  const naive = { paid: n.paid, payee: n.payee, amount: n.amount };
  const model = await decide(body, { gate: gate.action, reason: gate.reason, payeeName: u.payeeName ?? "none", amount: amount ?? 0 });
  return Response.json({ gate, framed, understood, shadow, naive, model, liveWalletMoved: false });
}
