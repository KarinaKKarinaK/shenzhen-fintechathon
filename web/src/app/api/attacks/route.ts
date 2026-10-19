import { runAll, runBenign } from "@/engine/attacks";
export const dynamic = "force-dynamic";
export async function GET() {
  const results = await runAll();
  const benign = runBenign();
  const naive = { fell: results.filter((r) => r.naive === "fell").length, total: results.length };
  return Response.json({ results, benign: { passed: benign.passed, total: benign.total }, naive, ranAt: new Date().toISOString() });
}
