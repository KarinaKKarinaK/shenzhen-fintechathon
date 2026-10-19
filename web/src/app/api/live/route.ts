import { live } from "@/engine/scenarios";
import { demoAuthorised } from "@/engine/chain";
import { allow, begin, end, ipOf, tooMany } from "@/engine/ratelimit";
import { pickLang, tr } from "@/engine/i18n";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // the Vercel hobby plan allows at most 300 seconds

// GET /api/live?scenario=fleet&lang=zh&every=8&seed=42&fast=1
// A feed of seeded jobs through the wallet, one every `every` seconds, until the client goes
// away or 5 minutes pass (the hosting limit). Same seed, same jobs. One connection per IP.
export async function GET(req: Request) {
  const ip = ipOf(req);
  if (!allow(ip)) return tooMany();
  if (!begin(ip)) return tooMany();
  const url = new URL(req.url);
  const q = url.searchParams;
  const fast = q.get("fast") === "1";
  const lang = pickLang(q.get("lang"));
  const every = Number(q.get("every") ?? 8);
  const seed = q.get("seed") === null ? undefined : Number(q.get("seed"));
  const real = demoAuthorised(req.headers);
  const ctrl = new AbortController();
  req.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: unknown) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`)); } catch { ctrl.abort(); } };
      try {
        for await (const ev of live({ fast, real, lang, signal: ctrl.signal, every: Number.isFinite(every) ? every : 8, seed: seed !== undefined && Number.isFinite(seed) ? Math.floor(Math.abs(seed)) : undefined })) {
          if (ctrl.signal.aborted) break;
          send(ev);
        }
      } catch (e) {
        send({ t: "narration", text: tr(lang, "run.stopped", { msg: (e as Error).message }), at: Date.now() });
      } finally {
        end(ip);
        try { controller.close(); } catch { /* already closed by the client */ }
      }
    },
    cancel() { ctrl.abort(); end(ip); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
