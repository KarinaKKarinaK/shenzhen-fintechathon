"use client";
// Ask the agent about a declined job. The pilot asks why, the agent answers from the engine's
// numbers and asks one question, the pilot corrects and the agent recomputes. The route is
// stateless: each call sends the job facts and the pilot's action.
import { useRef, useState } from "react";
import type { Job } from "@/engine/types";
import type { AskAction, AskChoice } from "@/engine/ask";
import { useLang } from "@/i18n/LangProvider";

type Turn =
  | { who: "pilot"; text: string }
  | { who: "agent"; text: string; question: string | null; choices: AskChoice[]; source: "template" | "model"; decision: "accept" | "decline" | "refused" | null };

export function AskAgent({ job }: { job: Job }) {
  const { d, t, lang } = useLang();
  const A = d.ask;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [rate, setRate] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  const send = async (said: string, action: AskAction, extra: { rate?: number; text?: string } = {}) => {
    if (busy) return;
    setBusy(true); setError(null);
    setTurns((x) => [...x, { who: "pilot", text: said }]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, action, ...extra, job: { id: job.id, title: job.title, mu: job.mu, fee: job.fee } }),
      });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error ?? res.statusText);
      setTurns((x) => [...x, { who: "agent", text: r.text, question: r.question, choices: r.choices ?? [], source: r.source, decision: r.decision }]);
    } catch (e) {
      setError(t("ask.failed", { msg: (e as Error).message }));
    } finally {
      setBusy(false);
      requestAnimationFrame(() => end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    }
  };

  const last = [...turns].reverse().find((x) => x.who === "agent");
  const choices = last && last.who === "agent" ? last.choices : [];
  const tone = { accept: "bg-gold-soft text-ink", decline: "bg-red-soft text-red-deep", refused: "bg-red text-white" } as const;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{A.title}</h2>
          <p className="text-xs text-muted">{t("ask.sub", { title: job.title })}</p>
        </div>
        {turns.length ? <button type="button" className="link shrink-0 text-xs" onClick={() => { setTurns([]); setError(null); }}>{A.reset}</button> : null}
      </div>

      {turns.length ? (
        <div className="scroll-thin flex max-h-[420px] flex-col gap-2 overflow-auto pr-1" aria-live="polite">
          {turns.map((x, i) => x.who === "pilot" ? (
            <div key={i} className="ml-6 self-end rounded-md bg-paper-2 px-3 py-2 text-sm"><span className="tech mr-2 text-[10px] uppercase tracking-wide text-muted">{A.you}</span>{x.text}</div>
          ) : (
            <div key={i} className="mr-2 rounded-md border border-line px-3 py-2 text-sm" style={{ borderLeft: "3px solid var(--color-red)" }}>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="tech text-[10px] uppercase tracking-wide text-muted">{A.agent}</span>
                <span className="mono text-[10px] text-muted">{x.source === "model" ? A.model : A.template}</span>
                {x.decision ? <span className={`pill ${tone[x.decision]}`}>{A.decision[x.decision]}</span> : null}
              </div>
              <p>{x.text}</p>
              {x.question ? <p className="mt-2 font-semibold">{x.question}</p> : null}
            </div>
          ))}
          <div ref={end} />
        </div>
      ) : null}

      {busy ? <div className="text-xs text-muted">{A.thinking}</div> : null}
      {error ? <div className="text-xs text-red-deep">{error}</div> : null}

      <div className="flex flex-wrap gap-2">
        {turns.length === 0 ? <button type="button" className="btn btn-red" disabled={busy} onClick={() => send(A.open, "why")}>{A.open}</button> : null}
        {choices.map((c, i) => (
          <button key={i} type="button" className="btn btn-ghost !px-3 !py-2 text-xs" disabled={busy} onClick={() => send(c.label, c.action, c.rate !== undefined ? { rate: c.rate } : {})}>{c.label}</button>
        ))}
      </div>

      {turns.length ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = Number(rate); if (!rate.trim()) return; send(`${rate} ${lang === "zh" ? "元/亩" : "yuan per mu"}`, "propose", { rate: v }); setRate(""); }}>
            <input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" placeholder={A.ratePh} aria-label={A.ratePh} className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm" />
            <button type="submit" className="btn btn-ghost !px-3 !py-2 text-xs" disabled={busy || !rate.trim()}>{A.propose}</button>
          </form>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = text.trim(); if (!v) return; send(v, "text", { text: v.slice(0, 300) }); setText(""); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={A.textPh} aria-label={A.textPh} className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm" />
            <button type="submit" className="btn btn-ghost !px-3 !py-2 text-xs" disabled={busy || !text.trim()}>{A.send}</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
