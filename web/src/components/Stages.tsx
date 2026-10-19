"use client";
import type { EngineEvent } from "@/engine/types";

// The six stages of one task, lit from the live event stream.
const STAGES = ["Lock", "Check", "Work", "Confirm", "Repay", "Own"] as const;

export function stageOf(events: EngineEvent[]): { on: number; done: Set<number> } {
  const done = new Set<number>();
  let on = -1;
  for (const e of events) {
    if (e.t === "job" && e.job.status === "locked") { on = 0; done.clear(); }
    if (e.t === "policy") { on = Math.max(on, 1); done.add(0); }
    if (e.t === "machine" && e.state.status === "moving") { on = 2; done.add(1); }
    if (e.t === "intent" && e.intent.kind === "claim_done") { on = 3; done.add(2); }
    if (e.t === "chain" && e.tx.kind === "instalment") { on = 4; done.add(3); }
    if (e.t === "chain" && e.tx.kind === "title") { on = 5; done.add(4); done.add(5); }
    if (e.t === "job" && (e.job.status === "declined" || e.job.status === "held")) { on = -1; }
  }
  return { on, done };
}

export function Stages({ events }: { events: EngineEvent[] }) {
  const { on, done } = stageOf(events);
  return (
    <ol className="grid grid-cols-3 gap-2 md:grid-cols-6">
      {STAGES.map((s, i) => (
        <li key={s} data-on={on === i} data-done={done.has(i)} className="stage cut-sm bg-white px-3 py-2 transition-colors duration-300">
          <div className="mono text-[10px] text-muted">{String(i + 1).padStart(2, "0")}</div>
          <div className="tech text-sm font-bold uppercase tracking-wide">{s}</div>
        </li>
      ))}
    </ol>
  );
}
