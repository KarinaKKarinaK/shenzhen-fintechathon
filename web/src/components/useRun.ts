"use client";
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ChainTx, EngineEvent, Intent, Job, MachineState, PolicyDecision, Side } from "@/engine/types";

export interface RunState {
  running: boolean;
  events: EngineEvent[];
  machine?: MachineState;
  jobs: Record<string, Job>;
  txs: ChainTx[];
  decisions: PolicyDecision[];
  intents: Intent[];
  messages: Extract<EngineEvent, { t: "agent.message" }>[];
  attacks: Extract<EngineEvent, { t: "attack" }>[];
  narration: string[];
  button?: { waiting: boolean; what: string };
  done?: string;
  balanceSeries: number[];
}

const initial: RunState = { running: false, events: [], jobs: {}, txs: [], decisions: [], intents: [], messages: [], attacks: [], narration: [], balanceSeries: [] };

function reduce(s: RunState, ev: EngineEvent | { t: "reset" } | { t: "start" } | { t: "stop" }): RunState {
  switch (ev.t) {
    case "reset": return { ...initial };
    case "start": return { ...initial, running: true };
    case "stop": return { ...s, running: false };
    case "machine": return { ...s, events: [...s.events, ev], machine: ev.state, balanceSeries: [...s.balanceSeries, ev.state.balance].slice(-60) };
    case "job": return { ...s, events: [...s.events, ev], jobs: { ...s.jobs, [ev.job.id]: ev.job } };
    case "chain": return { ...s, events: [...s.events, ev], txs: [ev.tx, ...s.txs] };
    case "policy": return { ...s, events: [...s.events, ev], decisions: [ev.decision, ...s.decisions] };
    case "intent": return { ...s, events: [...s.events, ev], intents: [ev.intent, ...s.intents] };
    case "agent.message": return { ...s, events: [...s.events, ev], messages: [...s.messages, ev] };
    case "attack": return { ...s, events: [...s.events, ev], attacks: [...s.attacks, ev] };
    case "narration": return { ...s, events: [...s.events, ev], narration: [...s.narration, ev.text] };
    case "button": return { ...s, events: [...s.events, ev], button: { waiting: ev.waiting, what: ev.what } };
    case "done": return { ...s, events: [...s.events, ev], done: ev.summary, running: false };
    default: return s;
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
          if (line) dispatch(JSON.parse(line.slice(6)) as EngineEvent);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") dispatch({ t: "narration", text: `Connection lost: ${(e as Error).message}`, at: Date.now() });
    } finally {
      dispatch({ t: "stop" });
    }
  }, [scenario, stop]);

  useEffect(() => () => abort.current?.abort(), []);
  return { state, start, stop, reset: () => dispatch({ t: "reset" }) };
}
