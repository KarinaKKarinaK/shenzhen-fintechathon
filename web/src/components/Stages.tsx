"use client";
import type { EngineEvent } from "@/engine/types";
import type { Solvency } from "./useRun";
import { useLang } from "@/i18n/LangProvider";

// The stages of one task, lit from the live event stream. Plan is stage 0, Check is stage 2.
const CHECK = 2;

export function stageOf(events: EngineEvent[]): { on: number; done: Set<number> } {
  const done = new Set<number>();
  let on = -1;
  for (const e of events) {
    const t = (e as { t: string }).t;
    if (t === "plan" || t === "economics") { on = Math.max(on, 0); }
    if (e.t === "job" && e.job.status === "locked") { on = 1; done.clear(); done.add(0); }
    if (e.t === "policy") { on = Math.max(on, 2); done.add(1); }
    if (e.t === "machine" && e.state.status === "moving") { on = 3; done.add(2); }
    if (e.t === "intent" && e.intent.kind === "claim_done") { on = 4; done.add(3); }
    if (e.t === "chain" && e.tx.kind === "instalment") { on = 5; done.add(4); }
    if (e.t === "chain" && e.tx.kind === "title") { on = 6; done.add(5); done.add(6); }
    if (e.t === "job" && (e.job.status === "declined" || e.job.status === "held")) { on = -1; }
  }
  return { on, done };
}

export function Stages({ events, solvency }: { events: EngineEvent[]; solvency?: Solvency }) {
  const { d, t } = useLang();
  const { on, done } = stageOf(events);
  const sol = solvency ? (solvency.covers ? t("stages.covers", { worst: solvency.worst, bond: solvency.bond }) : t("stages.capped")) : null;
  return (
    <ol className="grid grid-cols-4 gap-2 md:grid-cols-7">
      {d.stages.names.map((s, i) => (
        <li key={i} data-on={on === i} data-done={done.has(i)} className="stage cut-sm bg-white px-3 py-2 transition-colors duration-300">
          <div className="mono text-[10px] text-muted">{String(i).padStart(2, "0")}</div>
          <div className="tech text-sm font-bold uppercase tracking-wide">{s}</div>
          {i === CHECK && sol ? <div className={`mt-0.5 text-[10px] leading-tight ${solvency?.covers ? (on === i ? "text-gold-soft" : "text-gold-deep") : "text-muted"}`}>{sol}</div> : null}
        </li>
      ))}
    </ol>
  );
}
