import { SCENARIOS } from "@/engine/scenarios";
import { demoAuthorised, publicFisco } from "@/engine/chain";
import { allow, begin, end, ipOf, tooMany } from "@/engine/ratelimit";
import { pickLang, tr } from "@/engine/i18n";
import { append, chainHead, newRunId } from "@/engine/replay/log";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const ip = ipOf(req);
  if (!allow(ip)) return tooMany();
  if (!begin(ip)) return tooMany();
  const url = new URL(req.url);
  const name = (url.searchParams.get("scenario") || "fleet") as keyof typeof SCENARIOS;
  const fast = url.searchParams.get("fast") === "1";
  const lang = pickLang(url.searchParams.get("lang"));
  // Real chain mode only for a caller holding the demo token. Everyone else gets the simulation.
  const real = demoAuthorised(req.headers);
  // No token: the real FISCO BCOS chain when the public FISCO mode is on and the node answers.
  const fiscoOnly = !real && (await publicFisco());
  const gen = SCENARIOS[name] ?? SCENARIOS.fleet;
  const runId = newRunId(name);
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of gen({ fast, real: real || fiscoOnly, fiscoOnly, lang })) {
          append(runId, ev);
          controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
        }
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ t: "chain_head", runId, ...chainHead(runId), at: Date.now() })}\n\n`));
      } catch (e) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ t: "narration", text: tr(lang, "run.stopped", { msg: (e as Error).message }), at: Date.now() })}\n\n`));
      } finally {
        end(ip);
        controller.close();
      }
    },
    cancel() { end(ip); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
