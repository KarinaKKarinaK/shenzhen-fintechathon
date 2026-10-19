import { realChainFunded } from "@/engine/chain";
import * as attacksMod from "@/engine/attacks";
import { EvidenceView } from "@/components/EvidenceView";
import type { AttackResult } from "@/components/AttackGrid";

export const dynamic = "force-dynamic";

// Runs the attack set at request time on the server; the client view picks the language.
export default async function Page() {
  const mod = attacksMod as unknown as { runAll: () => AttackResult[] | Promise<AttackResult[]>; runBenign?: () => { passed: number; total: number } | Promise<{ passed: number; total: number }> };
  const results = await Promise.resolve(mod.runAll());
  const b = await Promise.resolve(mod.runBenign?.());
  const benign = b ? { passed: b.passed, total: b.total } : undefined;
  const chainReal = (await realChainFunded()).funded;
  const modelReal = !!(process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY);
  return <EvidenceView results={results} benign={benign} chainReal={chainReal} modelReal={modelReal} />;
}
