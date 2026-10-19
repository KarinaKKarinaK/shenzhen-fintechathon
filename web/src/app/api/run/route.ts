import { SCENARIOS } from "@/engine/scenarios";
import { demoAuthorised } from "@/engine/chain";
import { allow, begin, end, ipOf, tooMany } from "@/engine/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const ip = ipOf(req);
  if (!allow(ip)) return tooMany();
  if (!begin(ip)) return tooMany();
  const url = new URL(req.url);
  const name = (url.searchParams.get("scenario") || "fleet") as keyof typeof SCENARIOS;
  const fast = url.searchParams.get("fast") === "1";
  // Real chain mode only for a caller holding the demo token. Everyone else gets the simulation.
  const real = demoAuthorised(req.headers);
  const gen = SCENARIOS[name] ?? SCENARIOS.fleet;
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of gen({ fast, real })) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
        }
      } catch (e) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ t: "narration", text: `Run stopped: ${(e as Error).message}`, at: Date.now() })}\n\n`));
      } finally {
        end(ip);
        controller.close();
      }
    },
    cancel() { end(ip); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
