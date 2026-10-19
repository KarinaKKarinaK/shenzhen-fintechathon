"use client";
import type { EngineEvent } from "@/engine/types";
import { timeOf, yuan } from "./money";

// The live demo as five moments, in order. Each lights once from the event stream and keeps a one line caption.
export type MomentKey = "declined" | "instalment" | "held" | "slash" | "title";
export type Moment = { key: MomentKey; label: string; at?: number; text?: string };

const LIST: Array<[MomentKey, string]> = [["declined", "Job declined"], ["instalment", "Instalment paid"], ["held", "Faked log held"], ["slash", "Slash by proof"], ["title", "Title transferred"]];

export function momentsOf(events: EngineEvent[]): Moment[] {
  const found: Partial<Record<MomentKey, { at: number; text: string }>> = {};
  const hit = (k: MomentKey, at: number, text: string) => { if (!found[k]) found[k] = { at, text }; };
  const eco: Record<string, { margin?: number; reserveRule?: number; clears?: boolean }> = {};
  for (const e of events) {
    const r = e as unknown as Record<string, unknown> & { t: string; at: number };
    switch (e.t) {
      case "economics": eco[e.jobId] = e.eco; break;
      case "job": {
        const j = e.job;
        if (j.status === "declined") {
          const x = eco[j.id];
          hit("declined", e.at, x && x.clears === false ? `${j.title} declined. Margin ${yuan(x.margin)} is under the reserve rule ${yuan(x.reserveRule)}.` : `${j.title} declined by the policy engine.`);
        }
        if (j.status === "held") hit("held", e.at, `${j.title}: the flight log did not match the track. Fee held, lender told.`);
        break;
      }
      case "telemetry": if (!e.ok) hit("held", e.at, `Flight log claims ${e.claimedMu} mu, the track supports ${e.areaMu} mu. Fee held, lender told.`); break;
      case "proof": {
        const bond = typeof r.bond === "string" ? r.bond : typeof r.bondKind === "string" ? r.bondKind : "vendor";
        hit("slash", e.at, `A signed intent broke the ${e.rule} rule. ${yuan(e.slash)} slashed from the ${bond} bond.`);
        break;
      }
      case "chain": {
        const tx = e.tx;
        if (tx.kind === "instalment") hit("instalment", e.at, `${yuan(tx.amount)} to the lender, taken from a confirmed fee by rule.`);
        if (tx.kind === "slash") hit("slash", e.at, `${yuan(tx.amount)} slashed by proof.`);
        if (tx.kind === "title") hit("title", e.at, "Lease at zero. The title moved to the pilot on chain. The drone is theirs.");
        break;
      }
    }
  }
  return LIST.map(([key, label]) => ({ key, label, ...found[key] }));
}

export function Moments({ moments, active, onSelect }: { moments: Moment[]; active: MomentKey | null; onSelect: (k: MomentKey) => void }) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Five moments">
      {moments.map((m, i) => {
        const lit = typeof m.at === "number";
        return (
          <li key={m.key}>
            <button type="button" disabled={!lit} onClick={() => onSelect(m.key)} data-lit={lit} data-active={active === m.key} aria-pressed={active === m.key} className="moment cut-sm w-full text-left px-3 py-2 transition-colors duration-300">
              <div className="mono text-[10px]">{String(i + 1).padStart(2, "0")} {lit ? timeOf(m.at) : "waiting"}</div>
              <div className="tech text-sm font-bold uppercase tracking-wide">{m.label}</div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
