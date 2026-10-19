"use client";
import { useEffect, useState } from "react";
import { useRun } from "./useRun";
import type { AttackResult } from "./AttackGrid";
import { useLang } from "@/i18n/LangProvider";

// Streams the attack scenario over the request-time results. The view reads one list for every counter.
export function useAttackSet(initial: AttackResult[], benign?: { passed: number; total: number }) {
  const { t, lang } = useLang();
  const { state, start, stop } = useRun("attack", lang);
  const live: AttackResult[] = state.attacks.map((a, i) => ({ id: a.id ?? i + 1, name: a.name, nameZh: a.nameZh, layer: a.where, blocked: a.blocked, detail: a.detail, detailZh: a.detailZh, naive: a.naive, standard: a.standard, isolated: a.isolated }));
  const status = live.length ? t("lab.streamed", { n: live.length, total: initial.length, done: state.done ? `, ${state.done}` : "" }) : undefined;
  return { results: live.length ? live : initial, benign: state.benign ?? benign, running: state.running, start: () => start(false), stop, status };
}

// Fetches one fast fleet run and counts what came back, so a judge can read the raw events.
export function LastRun() {
  const { d, lang } = useLang();
  const E = d.evidence;
  const [raw, setRaw] = useState<string>("");
  const [counts, setCounts] = useState<{ intents: number; decisions: number; txs: number; proofs: number; events: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/run?scenario=fleet&fast=1&lang=${lang}`);
      const txt = await r.text();
      const events = txt.split("\n\n").map((p) => p.split("\n").find((l) => l.startsWith("data: "))).filter(Boolean).map((l) => { try { return JSON.parse((l as string).slice(6)); } catch { return null; } }).filter(Boolean) as Array<{ t: string }>;
      const n = (t: string) => events.filter((e) => e.t === t).length;
      setCounts({ intents: n("intent"), decisions: n("policy"), txs: n("chain"), proofs: n("proof"), events: events.length });
      setRaw(JSON.stringify(events, null, 1));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="text-sm">
      <div className="mb-2 flex justify-end"><button type="button" onClick={load} disabled={busy} className="btn btn-ghost !px-3 !py-1.5 !text-[11px]">{busy ? E.fetching : E.fetchAgain}</button></div>
      {err ? <div className="text-red">{err}</div> : null}
      {counts ? (
        <div className="grid grid-cols-5 gap-2 text-xs">
          {Object.entries(counts).map(([k, v]) => <div key={k} className="tile !p-2"><div className="text-muted">{(E.counts as Record<string, string>)[k] ?? k}</div><div className="kpi !text-xl">{v}</div></div>)}
        </div>
      ) : <div className="text-muted">{busy ? E.streaming : E.noRun}</div>}
      {raw ? <details className="mt-2"><summary className="cursor-pointer text-xs text-muted">{E.json}</summary><textarea readOnly value={raw} onFocus={(e) => e.currentTarget.select()} rows={10} className="mono mt-1 w-full rounded-sm bg-paper-2 p-2 text-[10px]" /></details> : null}
    </div>
  );
}
