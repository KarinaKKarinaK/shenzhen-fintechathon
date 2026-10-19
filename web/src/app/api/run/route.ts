import { SCENARIOS } from "@/engine/scenarios";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = (url.searchParams.get("scenario") || "neighbour") as keyof typeof SCENARIOS;
  const fast = url.searchParams.get("fast") === "1";
  const gen = SCENARIOS[name] ?? SCENARIOS.neighbour;
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of gen({ fast })) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
        }
      } catch (e) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ t: "narration", text: `Run stopped: ${(e as Error).message}`, at: Date.now() })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
