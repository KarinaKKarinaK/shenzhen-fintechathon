// GET /api/replay lists the runs in the event log with their chain heads.
// GET /api/replay?run=<id> verifies one run's hash chain and returns its events.
import { chainHead, listRuns, replay, verify } from "@/engine/replay/log";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const run = url.searchParams.get("run");
  if (!run) return Response.json({ runs: listRuns() });
  const { head, length } = chainHead(run);
  if (!length) return Response.json({ error: "no such run" }, { status: 404 });
  const v = verify(run);
  return Response.json({ runId: run, head, length, ok: v.ok, brokenAt: v.brokenAt, events: replay(run) });
}
