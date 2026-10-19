"use client";
import type { EngineEvent } from "@/engine/types";
import { StatusIcon } from "./StatusIcon";

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
        <li key={s} data-on={on === i} data-done={done.has(i)} className="stage flex items-center justify-between gap-2 rounded-md border border-rule bg-surface px-3 py-2.5 transition-colors duration-300">
          <span><span className="block text-[13px] text-ink-2">Step {i + 1}</span><span className="block font-semibold">{s}</span></span>
          {done.has(i) && on !== i ? <StatusIcon kind="pass" /> : null}
        </li>
      ))}
    </ol>
  );
}
