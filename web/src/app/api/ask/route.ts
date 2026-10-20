// Ask the agent about a declined job. Stateless: the client sends the job facts and the action
// (or free text). Numbers and decisions come from engine/ask.ts. With a model key, the model may
// rephrase the explanation sentence only, and its text must use the same numbers, otherwise the
// template is kept.
import { answer, AskError, type AskAction } from "@/engine/ask";
import { explain, hasKey } from "@/engine/model";
import { pickLang } from "@/engine/i18n";
import { allow, ipOf } from "@/engine/ratelimit";

export const dynamic = "force-dynamic";

const ACTIONS: AskAction[] = ["why", "accept_counter", "propose", "lower_reserve", "decline", "text"];

export async function POST(req: Request) {
  if (!allow(`ask:${ipOf(req)}`, 30)) return Response.json({ error: "too many requests" }, { status: 429 });
  const raw = await req.text();
  if (raw.length > 4096) return Response.json({ error: "body over 4 KiB" }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw) as Record<string, unknown>; } catch { return Response.json({ error: "not valid JSON" }, { status: 400 }); }
  const action = ACTIONS.includes(body.action as AskAction) ? (body.action as AskAction) : null;
  if (!action) return Response.json({ error: `action must be one of ${ACTIONS.join(", ")}` }, { status: 400 });
  const lang = pickLang(body.lang);
  try {
    const r = answer({ lang, job: body.job as never, action, rate: body.rate === undefined ? undefined : Number(body.rate), text: typeof body.text === "string" ? body.text : undefined });
    let source: "template" | "model" = "template";
    let text = r.text;
    if (r.kind === "explain" && hasKey()) {
      const m = await explain("machine", r.facts, r.text, lang);
      text = m.text; source = m.source;
    }
    return Response.json({ ...r, text, source });
  } catch (e) {
    if (e instanceof AskError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
