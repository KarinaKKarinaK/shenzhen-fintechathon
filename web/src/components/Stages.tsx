"use client";
import type { EngineEvent } from "@/engine/types";
import type { Solvency } from "./useRun";
import { StatusIcon } from "./StatusIcon";

// The stages of one task, lit from the live event stream. Plan is stage 0.
const STAGES = ["Plan", "Lock", "Check", "Work", "Confirm", "Repay", "Own"] as const;

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
  const { on, done } = stageOf(events);
  const sol = solvency ? (solvency.covers ? `worst case ${solvency.worst}, bond ${solvency.bond}, covers` : "earning in, capped task") : null;
  return (
    <ol className="grid grid-cols-4 gap-2 md:grid-cols-7">
      {STAGES.map((s, i) => (
        <li key={s} data-on={on === i} data-done={done.has(i)} className={`stage flex items-start justify-between gap-2 rounded-md border px-3 py-2.5 transition-colors duration-300 ${on === i ? "border-ink bg-ink text-white" : "border-rule bg-surface"}`}>
          <span>
            <span className={`block text-[13px] ${on === i ? "text-white/75" : "text-ink-2"}`}>Step {i}</span>
            <span className="block font-semibold">{s}</span>
            {s === "Check" && sol ? <span className={`mt-0.5 block text-[12px] leading-tight ${on === i ? "text-white/80" : solvency?.covers ? "text-gold-text" : "text-ink-2"}`}>{sol}</span> : null}
          </span>
          {done.has(i) && on !== i ? <StatusIcon kind="pass" /> : null}
        </li>
      ))}
    </ol>
  );
}
