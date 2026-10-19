"use client";
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ChainTx, EngineEvent, Intent, Job, MachineState, PolicyDecision, Side } from "@/engine/types";

// Loose shapes for the events the backend is adding. Every field is optional so the page
// renders even when an event arrives without it.
export type Gate = { action?: string; categories?: string[]; reason?: string; framed?: string; preamble?: string; messageIndex?: number; index?: number };
export type Understood = { jobId?: string; task?: string; window?: string; fee?: number; geofence?: string; payeeName?: string | null; hadAddress?: boolean; addressInText?: boolean; by?: string; source?: string };
export type PlanItem = { rank?: number; order?: number | null; jobId?: string; title?: string; fee?: number; marginPerMu?: number; margin?: number; reason?: string; declined?: boolean; clears?: boolean };
export type Solvency = { jobId?: string; worst?: number; bond?: number; covers?: boolean; capped?: boolean };
export type Econ = { jobId?: string; fee?: number; instalment?: number; energy?: number; cover?: number; rail?: number; margin?: number; reserveRule?: number; clears?: boolean };
export type Telemetry = { jobId?: string; trackM?: number; track?: number; swath?: number; seconds?: number; areaSupported?: number; areaClaimed?: number; ratio?: number; ok?: boolean; held?: boolean };
export type Proof = { intentId?: string; intentHash?: string; jobId?: string; rule?: string; bond?: string; bondKind?: string; signer?: string; slash?: number; bounty?: number; treasury?: number; harmed?: number; paidTo?: string[]; shadow?: boolean; submitterAddr?: string; submitter?: string; isParty?: boolean; at?: number };
// The engine is adding these. Every field is optional so the page renders before they arrive.
export type TxView = ChainTx & { status?: "pending" | "confirmed" | "finalised"; confirmedAt?: number; finalisedAt?: number; currency?: string; seenAt?: number };
export type MachineView = MachineState & { vendorBond?: number; vendorBondMin?: number; vendorPenalty?: number; vendorDailyCap?: number; startFloor?: number; muDone?: number; muTotal?: number };
export type LogEv = { jobId?: string; intentHash?: string; parties?: string[]; at: number };
export type MessageEv = Extract<EngineEvent, { t: "agent.message" }> & { facts?: Record<string, string | number | boolean>; source?: string; grounded?: boolean };
export type AttackEv = Extract<EngineEvent, { t: "attack" }> & { naive?: boolean | "fell" | "held"; standard?: string; isolated?: boolean; id?: number };
export type LooseEvent = EngineEvent | ({ t: string; at: number } & Record<string, unknown>);

export interface RunState {
  running: boolean;
  events: EngineEvent[];
  machine?: MachineView;
  jobs: Record<string, Job>;
  txs: TxView[];
  decisions: PolicyDecision[];
  intents: Intent[];
  messages: MessageEv[];
  attacks: AttackEv[];
  narration: string[];
  button?: { waiting: boolean; what: string; signer?: string };
  done?: string;
  balanceSeries: number[];
  gates: Record<number, Gate>;
  understood: Record<string, Understood>;
  plan?: PlanItem[];
  solvency: Record<string, Solvency>;
  economics: Record<string, Econ>;
  telemetry: Record<string, Telemetry>;
  proofs: Proof[];
  logs: Record<string, LogEv>;
  model?: string;
  benign?: { passed: number; total: number };
}

const initial: RunState = { running: false, events: [], jobs: {}, txs: [], decisions: [], intents: [], messages: [], attacks: [], narration: [], balanceSeries: [], gates: {}, understood: {}, solvency: {}, economics: {}, telemetry: {}, proofs: [], logs: {} };

type Action = LooseEvent | { t: "reset" } | { t: "start" } | { t: "stop" } | { t: "append"; events: LooseEvent[] };

function key(v: unknown, fallback: string) { return typeof v === "string" && v ? v : fallback; }

function reduce(s: RunState, ev: Action): RunState {
  switch (ev.t) {
    case "reset": return { ...initial };
    case "start": return { ...initial, running: true };
    case "stop": return { ...s, running: false };
    case "append": return (ev as { events: LooseEvent[] }).events.reduce(reduce, s);
  }
  const e = ev as EngineEvent;
  const r = ev as { t: string; at: number } & Record<string, unknown>;
  const events = [...s.events, e];
  switch (e.t) {
    case "machine": return { ...s, events, machine: e.state, balanceSeries: [...s.balanceSeries, e.state.balance].slice(-60) };
    case "job": return { ...s, events, jobs: { ...s.jobs, [e.job.id]: e.job } };
    case "chain": {
      // A transaction updates in place by hash as it goes pending, confirmed, finalised.
      const tx = e.tx as TxView;
      const i = s.txs.findIndex((t) => t.hash === tx.hash);
      if (i >= 0) { const txs = s.txs.slice(); txs[i] = { ...txs[i], ...tx, seenAt: txs[i].seenAt ?? e.at }; return { ...s, events, txs }; }
      return { ...s, events, txs: [{ ...tx, seenAt: e.at }, ...s.txs] };
    }
    case "policy": return { ...s, events, decisions: [e.decision, ...s.decisions] };
    case "intent": return { ...s, events, intents: [e.intent, ...s.intents] };
    case "agent.message": return { ...s, events, messages: [...s.messages, e as MessageEv] };
    case "attack": return { ...s, events, attacks: [...s.attacks, e as AttackEv] };
    case "narration": return { ...s, events, narration: [...s.narration, e.text] };
    case "button": return { ...s, events, button: { waiting: e.waiting, what: e.what, signer: typeof r.signer === "string" ? r.signer : s.button?.signer } };
    case "done": return { ...s, events, done: e.summary, running: false };
  }
  // Events the backend is adding. Keyed so panels can look them up without scanning.
  switch (r.t) {
    case "gate": {
      const g = (r.gate as Gate | undefined) ?? (r as Gate);
      // No index on the event: a gate follows the untrusted message it judged, else it precedes the next one.
      const lastIdx = s.messages.length - 1;
      const follows = lastIdx >= 0 && s.messages[lastIdx].untrusted && !s.gates[lastIdx];
      const idx = typeof r.messageIndex === "number" ? r.messageIndex : typeof r.index === "number" ? r.index : follows ? lastIdx : s.messages.length;
      return { ...s, events, gates: { ...s.gates, [idx]: { ...g, messageIndex: idx } } };
    }
    case "understood": {
      const fields = (r.fields as Understood | undefined) ?? (r.understood as Understood | undefined) ?? (r as Understood);
      const u: Understood = { ...fields, jobId: key(r.jobId, fields.jobId ?? "last"), by: typeof r.source === "string" ? r.source : fields.by, hadAddress: fields.hadAddress ?? (typeof r.hadAddress === "boolean" ? r.hadAddress : undefined) };
      return { ...s, events, understood: { ...s.understood, [u.jobId ?? "last"]: u, last: u } };
    }
    case "plan": {
      const items = (r.items ?? r.plan ?? r.jobs) as PlanItem[] | undefined;
      return { ...s, events, plan: Array.isArray(items) ? items : s.plan };
    }
    case "solvency": {
      const v = (r.solvency as Solvency | undefined) ?? (r as Solvency);
      return { ...s, events, solvency: { ...s.solvency, [key(v.jobId ?? r.jobId, "last")]: v, last: v } };
    }
    case "economics": {
      const base = (r.eco as Econ | undefined) ?? (r.economics as Econ | undefined) ?? (r as Econ);
      const v: Econ = { ...base, jobId: key(r.jobId, base.jobId ?? "last") };
      return { ...s, events, economics: { ...s.economics, [v.jobId ?? "last"]: v, last: v } };
    }
    case "telemetry": {
      const t = (r.telemetry as Record<string, unknown> | undefined) ?? r;
      const n = (k: string) => (typeof t[k] === "number" ? (t[k] as number) : undefined);
      const v: Telemetry = { jobId: key(t.jobId, "last"), trackM: n("trackM") ?? n("track"), swath: n("swath") ?? n("swathM"), seconds: n("seconds"), areaSupported: n("areaSupported") ?? n("areaMu"), areaClaimed: n("areaClaimed") ?? n("claimedMu"), ratio: n("ratio"), ok: typeof t.ok === "boolean" ? t.ok : undefined, held: typeof t.held === "boolean" ? t.held : typeof t.ok === "boolean" ? !t.ok : undefined };
      return { ...s, events, telemetry: { ...s.telemetry, [v.jobId ?? "last"]: v, last: v } };
    }
    case "proof": {
      const p = (r.proof as Proof | undefined) ?? (r as Proof);
      return { ...s, events, proofs: [...s.proofs, { ...p, at: r.at }] };
    }
    case "log": {
      const hash = key(r.intentHash, `log-${events.length}`);
      const parties = Array.isArray(r.parties) ? (r.parties as unknown[]).map(String) : undefined;
      return { ...s, events, logs: { ...s.logs, [hash]: { jobId: typeof r.jobId === "string" ? r.jobId : undefined, intentHash: hash, parties, at: r.at } } };
    }
    case "model": return { ...s, events, model: typeof r.name === "string" ? r.name : typeof r.model === "string" ? r.model : s.model };
    case "benign": return { ...s, events, benign: { passed: Number(r.passed ?? 0), total: Number(r.total ?? 0) } };
    default: return { ...s, events };
  }
}

export function useRun(scenario: Side) {
  const [state, dispatch] = useReducer(reduce, initial);
  const abort = useRef<AbortController | null>(null);

  const stop = useCallback(() => { abort.current?.abort(); abort.current = null; dispatch({ t: "stop" }); }, []);

  const start = useCallback(async (fast = false) => {
    stop();
    dispatch({ t: "start" });
    const ac = new AbortController();
    abort.current = ac;
    try {
      const res = await fetch(`/api/run?scenario=${scenario}&fast=${fast ? 1 : 0}`, { signal: ac.signal });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          const line = p.split("\n").find((l) => l.startsWith("data: "));
          if (line) { try { dispatch(JSON.parse(line.slice(6)) as LooseEvent); } catch { /* skip a bad line */ } }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") dispatch({ t: "narration", text: `Connection lost: ${(e as Error).message}`, at: Date.now() });
    } finally {
      dispatch({ t: "stop" });
    }
  }, [scenario, stop]);

  // Events returned by POST /api/button land here.
  const append = useCallback((events: LooseEvent[]) => { if (Array.isArray(events) && events.length) dispatch({ t: "append", events }); }, []);

  useEffect(() => () => abort.current?.abort(), []);
  return { state, start, stop, append, reset: () => dispatch({ t: "reset" }) };
}
