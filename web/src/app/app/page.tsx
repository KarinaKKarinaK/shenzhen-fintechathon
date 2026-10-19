import { ATTACKS, runAll } from "@/engine/attacks";
import { DEFAULT_POLICY } from "@/engine/policy";
import { DashboardView } from "@/components/DashboardView";

export const dynamic = "force-dynamic";

function fmt(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (v && typeof v === "object") return Object.keys(v).join(", ");
  return String(v);
}

// Runs the attack set on the server and hands the numbers to the client view, which picks the language.
export default async function Page() {
  const results = await Promise.resolve(runAll());
  const blocked = results.filter((r) => r.blocked).length;
  const byLayer = (["message", "policy", "contract"] as const).map((l) => ({ l, n: results.filter((r) => r.layer === l).length, b: results.filter((r) => r.layer === l && r.blocked).length }));
  const policy = Object.entries(DEFAULT_POLICY).map(([k, v]) => [k, fmt(v)] as [string, string]);
  const allowlist = Object.entries(DEFAULT_POLICY.allowlist);
  const caps = { perTx: DEFAULT_POLICY.perTxCap, daily: DEFAULT_POLICY.dailyCap, band: DEFAULT_POLICY.rateBand };
  return <DashboardView attackN={ATTACKS.length} blocked={blocked} total={results.length} byLayer={byLayer} policy={policy} allowlist={allowlist} caps={caps} />;
}
