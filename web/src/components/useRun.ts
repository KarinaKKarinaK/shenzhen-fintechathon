"use client";
import { demoHeaders } from "./demoToken";
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ChainTx, EngineEvent, Intent, Job, MachineState, PolicyDecision, Side } from "@/engine/types";
import { translate, type Lang } from "@/i18n/LangProvider";

// Loose shapes for the events the backend is adding. Every field is optional so the page
// renders even when an event arrives without it.
export type Gate = { action?: string; categories?: string[]; reason?: string; framed?: string; preamble?: string; messageIndex?: number; index?: number };
export type Understood = { jobId?: string; task?: string; window?: string; fee?: number; geofence?: string; payeeName?: string | null; hadAddress?: boolean; addressInText?: boolean; by?: string; source?: string; confidence?: number };
export type PlanItem = { rank?: number; order?: number | null; jobId?: string; title?: string; fee?: number; mu?: number; marginPerMu?: number; margin?: number; reason?: string; declined?: boolean; accepted?: boolean; clears?: boolean };
// The knapsack planner adds these to the plan event.
export type PlanMeta = { budgetMu?: number; usedMu?: number; charges?: number; totalMargin?: number; method?: string };
export type Solvency = { jobId?: string; worst?: number; bond?: number; covers?: boolean; capped?: boolean };
export type Econ = { jobId?: string; fee?: number; instalment?: number; energy?: number; cover?: number; rail?: number; margin?: number; reserveRule?: number; clears?: boolean };
export type Telemetry = { jobId?: string; trackM?: number; track?: number; swath?: number; seconds?: number; areaSupported?: number; areaClaimed?: number; ratio?: number; ok?: boolean; held?: boolean; z?: number; reasons?: string[] };
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
  planMeta?: PlanMeta;
  solvency: Record<string, Solvency>;
  economics: Record<string, Econ>;
  telemetry: Record<string, Telemetry>;
  proofs: Proof[];
  logs: Record<string, LogEv>;
  model?: string;
  benign?: { passed: number; total: number };
  lang?: Lang; // the language the current events were fetched in
  fast?: boolean;
  processed: number; // jobs that reached a final status; the live feed counts them up
  errors?: string[]; // what the server refused, in plain words
}

const initial: RunState = { running: false, events: [], jobs: {}, txs: [], decisions: [], intents: [], messages: [], attacks: [], narration: [], balanceSeries: [], gates: {}, understood: {}, solvency: {}, economics: {}, telemetry: {}, proofs: [], logs: {}, processed: 0 };

// An endless stream keeps the last of everything so the page stays light.
const KEEP = 1000;
const FINAL = new Set<Job["status"]>(["released", "declined", "held"]);

type Action = LooseEvent | { t: "reset" } | { t: "start"; lang: Lang; fast: boolean } | { t: "stop" } | { t: "append"; events: LooseEvent[] } | { t: "fail"; errors: string[] };

function key(v: unknown, fallback: string) { return typeof v === "string" && v ? v : fallback; }

function reduce(s: RunState, ev: Action): RunState {
  switch (ev.t) {
    case "reset": return { ...initial };
    case "start": return { ...initial, running: true, lang: (ev as { lang: Lang }).lang, fast: (ev as { fast: boolean }).fast };
    case "stop": return { ...s, running: false };
    case "fail": return { ...s, running: false, errors: (ev as { errors: string[] }).errors };
    case "append": return (ev as { events: LooseEvent[] }).events.reduce(reduce, s);
  }
  const e = ev as EngineEvent;
  const r = ev as { t: string; at: number } & Record<string, unknown>;
  const events = s.events.length >= KEEP ? [...s.events.slice(-KEEP + 1), e] : [...s.events, e];
  switch (e.t) {
    case "machine": return { ...s, events, machine: e.state, balanceSeries: [...s.balanceSeries, e.state.balance].slice(-60) };
    case "job": {
      const was = s.jobs[e.job.id]?.status;
      const finished = FINAL.has(e.job.status) && was !== e.job.status;
      return { ...s, events, jobs: { ...s.jobs, [e.job.id]: e.job }, processed: finished ? s.processed + 1 : s.processed };
    }
    case "chain": {
      // A transaction updates in place by hash as it goes pending, confirmed, finalised.
      const tx = e.tx as TxView;
      const i = s.txs.findIndex((t) => t.hash === tx.hash);
      if (i >= 0) { const txs = s.txs.slice(); txs[i] = { ...txs[i], ...tx, seenAt: txs[i].seenAt ?? e.at }; return { ...s, events, txs }; }
      return { ...s, events, txs: [{ ...tx, seenAt: e.at }, ...s.txs].slice(0, KEEP) };
    }
    case "policy": return { ...s, events, decisions: [e.decision, ...s.decisions].slice(0, KEEP) };
    case "intent": return { ...s, events, intents: [e.intent, ...s.intents].slice(0, KEEP) };
    case "agent.message": return { ...s, events, messages: [...s.messages, e as MessageEv] };
    case "attack": return { ...s, events, attacks: [...s.attacks, e as AttackEv].slice(-KEEP) };
    case "narration": return { ...s, events, narration: [...s.narration, e.text].slice(-KEEP) };
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
      // Items as one list, or as accepted and declined lists from the knapsack planner.
      let items = (r.items ?? r.plan ?? r.jobs) as PlanItem[] | undefined;
      if (!Array.isArray(items)) {
        const acc = Array.isArray(r.accepted) ? (r.accepted as PlanItem[]).map((p) => ({ ...p, declined: false })) : [];
        const dec = Array.isArray(r.declined) ? (r.declined as PlanItem[]).map((p) => ({ ...p, declined: true })) : [];
        items = acc.length || dec.length ? [...acc, ...dec] : undefined;
      }
      const num = (k: string) => (typeof r[k] === "number" ? (r[k] as number) : undefined);
      const planMeta: PlanMeta = { budgetMu: num("budgetMu"), usedMu: num("usedMu"), charges: num("charges"), totalMargin: num("totalMargin"), method: typeof r.method === "string" ? r.method : undefined };
      return { ...s, events, plan: Array.isArray(items) ? items : s.plan, planMeta };
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
      const v: Telemetry = { jobId: key(t.jobId, "last"), trackM: n("trackM") ?? n("track"), swath: n("swath") ?? n("swathM"), seconds: n("seconds"), areaSupported: n("areaSupported") ?? n("areaMu"), areaClaimed: n("areaClaimed") ?? n("claimedMu"), ratio: n("ratio"), ok: typeof t.ok === "boolean" ? t.ok : undefined, held: typeof t.held === "boolean" ? t.held : typeof t.ok === "boolean" ? !t.ok : undefined, z: n("z"), reasons: Array.isArray(t.reasons) ? (t.reasons as unknown[]).map(String) : undefined };
      return { ...s, events, telemetry: { ...s.telemetry, [v.jobId ?? "last"]: v, last: v } };
    }
    case "proof": {
      const p = (r.proof as Proof | undefined) ?? (r as Proof);
      return { ...s, events, proofs: [...s.proofs, { ...p, at: r.at }].slice(-KEEP) };
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

// Turns a refused response into plain lines. Guards every shape the API might send:
// { errors: [{ path, message }] }, { issues: [{ path, reason }] } from the schema, { error } or { message }.
async function errorsOf(res: Response): Promise<string[]> {
  const text = await res.text().catch(() => "");
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { /* not json */ }
  const out: string[] = [];
  const b = (body ?? {}) as Record<string, unknown>;
  const list = Array.isArray(b.errors) ? b.errors : Array.isArray(b.issues) ? b.issues : [];
  for (const it of list as unknown[]) {
    if (typeof it === "string") { out.push(it); continue; }
    const o = (it ?? {}) as Record<string, unknown>;
    const path = Array.isArray(o.path) ? o.path.join(".") : typeof o.path === "string" ? o.path : "";
    const msg = typeof o.message === "string" ? o.message : typeof o.reason === "string" ? o.reason : JSON.stringify(o);
    out.push(path ? `${path}: ${msg}` : msg);
  }
  if (!out.length && typeof b.error === "string") out.push(b.error);
  if (!out.length && typeof b.message === "string") out.push(b.message);
  if (!out.length) out.push(text.trim() ? text.trim().slice(0, 300) : `HTTP ${res.status}`);
  return out;
}

// Streams one scenario from GET /api/run in the given language. The language is sent with the
// request, so the narration and the scripted agent messages arrive already translated.
export function useRun(scenario: Side, lang: Lang = "en") {
  const [state, dispatch] = useReducer(reduce, initial);
  const abort = useRef<AbortController | null>(null);

  const stop = useCallback(() => { abort.current?.abort(); abort.current = null; dispatch({ t: "stop" }); }, []);

  // Opens any SSE endpoint that speaks engine events and feeds it into the reducer. A response
  // that is not a stream (a 400 with schema errors, say) ends the run with its errors listed.
  const startStream = useCallback(async (url: string, init?: RequestInit & { fast?: boolean }, onEnd?: () => void) => {
    stop();
    dispatch({ t: "start", lang, fast: init?.fast ?? false });
    const ac = new AbortController();
    abort.current = ac;
    try {
      const rest: RequestInit & { fast?: boolean } = { ...init };
      delete rest.fast;
      const res = await fetch(url, { ...rest, signal: ac.signal, headers: { ...demoHeaders(), ...(init?.headers as Record<string, string> | undefined) } });
      if (!res.ok || !res.body) { dispatch({ t: "fail", errors: await errorsOf(res) }); return; }
      const reader = res.body.getReader();
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
      if ((e as Error).name !== "AbortError") dispatch({ t: "narration", text: translate(lang, "run.connectionLost", { msg: (e as Error).message }), at: Date.now() });
    } finally {
      // Ended on its own (not stopped by the user): the caller may chain the next segment.
      const natural = abort.current === ac && !ac.signal.aborted;
      if (abort.current === ac) dispatch({ t: "stop" });
      if (natural && onEnd) onEnd();
    }
  }, [lang, stop]);

  const start = useCallback((fast = false) => startStream(`/api/run?scenario=${scenario}&fast=${fast ? 1 : 0}&lang=${lang}`, { fast }), [scenario, lang, startStream]);

  // Events returned by POST /api/button land here.
  const append = useCallback((events: LooseEvent[]) => { if (Array.isArray(events) && events.length) dispatch({ t: "append", events }); }, []);

  useEffect(() => () => abort.current?.abort(), []);
  return { state, start, startStream, stop, append, reset: () => dispatch({ t: "reset" }) };
}
