"use client";
import { useEffect, useState } from "react";
import { useRun } from "./useRun";
import { AttackGrid, type AttackResult } from "./AttackGrid";

// Streams the attack scenario into the grid, tile by tile. Falls back to the request-time results.
export function EvidenceLab({ initial, benign }: { initial: AttackResult[]; benign?: { passed: number; total: number } }) {
  const { state, start, stop } = useRun("attack");
  const live: AttackResult[] = state.attacks.map((a, i) => ({ id: a.id ?? i + 1, name: a.name, layer: a.where, blocked: a.blocked, detail: a.detail, naive: a.naive, standard: a.standard, isolated: a.isolated }));
  const results = live.length ? live : initial;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-sm font-semibold">Attack set</h2><span className="text-[13px] text-muted">{live.length ? `${live.length} of ${initial.length} streamed${state.done ? `, ${state.done}` : ""}` : "request-time results, click a tile for the reason"}</span></div>
        <div className="flex gap-2">
          {!state.running ? <button className="btn btn-red !px-3 !py-2 !text-[12px]" onClick={() => start(false)}>Run all attacks</button> : <button className="btn btn-ghost !px-3 !py-2 !text-[12px]" onClick={stop}>Stop</button>}
        </div>
      </div>
      <AttackGrid results={results} benign={state.benign ?? benign} />
    </div>
  );
}

// Fetches one fast fleet run and counts what came back, so a judge can read the raw events.
export function LastRun() {
  const [raw, setRaw] = useState<string>("");
  const [counts, setCounts] = useState<{ intents: number; decisions: number; txs: number; proofs: number; events: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/run?scenario=fleet&fast=1");
      const txt = await r.text();
      const events = txt.split("\n\n").map((p) => p.split("\n").find((l) => l.startsWith("data: "))).filter(Boolean).map((l) => { try { return JSON.parse((l as string).slice(6)); } catch { return null; } }).filter(Boolean) as Array<{ t: string }>;
      const n = (t: string) => events.filter((e) => e.t === t).length;
      setCounts({ intents: n("intent"), decisions: n("policy"), txs: n("chain"), proofs: n("proof"), events: events.length });
      setRaw(JSON.stringify(events, null, 1));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);
  return (
    <div className="text-sm">
      <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Last run, raw</h2><button type="button" onClick={load} disabled={busy} className="btn btn-ghost !px-3 !py-1.5 !text-[12px]">{busy ? "Fetching" : "Fetch again"}</button></div>
      {err ? <div className="text-red">{err}</div> : null}
      {counts ? (
        <div className="grid grid-cols-5 gap-2 text-[13px]">
          {Object.entries(counts).map(([k, v]) => <div key={k} className="tile !p-2"><div className="text-muted">{k}</div><div className="kpi !text-xl">{v}</div></div>)}
        </div>
      ) : <div className="text-muted">{busy ? "Streaming a fast fleet run" : "No run yet."}</div>}
      {raw ? <details className="mt-2"><summary className="cursor-pointer text-[13px] text-muted">Events as JSON, select all to copy</summary><textarea readOnly value={raw} onFocus={(e) => e.currentTarget.select()} rows={10} className="mono mt-1 w-full rounded-sm bg-paper-2 p-2 text-[12px]" /></details> : null}
    </div>
  );
}
