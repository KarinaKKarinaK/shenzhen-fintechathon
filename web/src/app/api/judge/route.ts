import { judge, frame } from "@/engine/framing";
import { PolicyEngine } from "@/engine/policy";
import { sign } from "@/engine/agents";

export const dynamic = "force-dynamic";

// Judge console: a judge types anything. The shadow agent treats it as a counterparty message,
// the gate decides, and if a payment is implied we show what the policy engine would do with it.
export async function POST(req: Request) {
  const { text } = (await req.json()) as { text: string };
  const body = String(text ?? "").slice(0, 70_000);
  const gate = judge(body, "unknown");
  const framed = frame("judge-console", "unknown", body);
  const amountMatch = body.match(/\b(\d{1,9})\b/);
  const addr = body.match(/0x[a-fA-F0-9]{40}/)?.[0];
  const amount = amountMatch ? Number(amountMatch[1]) : 5;
  const intent = sign("machine", "pay", { payee: addr ?? "0x0000000000000000000000000000000000000000", amount, note: "shadow run from the judge console" });
  const decision = new PolicyEngine().evaluate(intent, { reference: 7 });
  return Response.json({ gate, framed, shadow: { intent, decision }, liveWalletMoved: false });
}
