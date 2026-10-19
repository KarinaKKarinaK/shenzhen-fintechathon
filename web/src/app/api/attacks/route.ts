import { runAll } from "@/engine/attacks";
export const dynamic = "force-dynamic";
export async function GET() { return Response.json({ results: runAll(), ranAt: new Date().toISOString() }); }
