import { custom } from "@/engine/scenarios";
import { demoAuthorised, publicFisco } from "@/engine/chain";
import { allow, begin, end, ipOf, tooMany } from "@/engine/ratelimit";
import { pickLang, tr } from "@/engine/i18n";
import { InputError, parseRunInput, type RunInput } from "@/engine/schema";
import { ingest } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const MAX_BYTES = 256 * 1024;

const bad = (status: number, error: string, issues?: { path: string; reason: string }[]) =>
  Response.json({ error, issues: issues ?? [] }, { status });

// Reads the body as a run input: JSON, or multipart with a "file" field (JSON or CSV) and an
// optional "flights" CSV. Returns the parsed input or an error response.
async function readInput(req: Request): Promise<RunInput | Response> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) return bad(413, `body over ${MAX_BYTES / 1024} KiB`);
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return bad(400, "multipart needs a 'file' field");
      const flights = form.get("flights");
      if (file.size + (flights instanceof File ? flights.size : 0) > MAX_BYTES) return bad(413, `files over ${MAX_BYTES / 1024} KiB`);
      const lang = form.get("lang");
      return ingest({ text: await file.text(), name: file.name, flights: flights instanceof File ? await flights.text() : undefined, lang: typeof lang === "string" ? lang : undefined });
    }
    const text = await req.text();
    if (text.length > MAX_BYTES) return bad(413, `body over ${MAX_BYTES / 1024} KiB`);
    if (!text.trim()) return bad(400, "empty body");
    let json: unknown;
    try { json = JSON.parse(text); } catch (e) { return bad(400, `not valid JSON: ${(e as Error).message}`); }
    return parseRunInput(json);
  } catch (e) {
    if (e instanceof InputError) return bad(400, "input rejected", e.issues);
    return bad(400, (e as Error).message);
  }
}

export async function POST(req: Request) {
  const ip = ipOf(req);
  if (!allow(ip)) return tooMany();
  const input = await readInput(req);
  if (input instanceof Response) return input;
  if (!begin(ip)) return tooMany();
  const url = new URL(req.url);
  const fast = url.searchParams.get("fast") === "1";
  const lang = pickLang(url.searchParams.get("lang") ?? input.lang);
  // Real chain mode only for a caller holding the demo token. Everyone else gets the simulation.
  const real = demoAuthorised(req.headers);
  const fiscoOnly = !real && (await publicFisco());
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of custom(input, { fast, real: real || fiscoOnly, fiscoOnly, lang, signal: req.signal })) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
        }
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
