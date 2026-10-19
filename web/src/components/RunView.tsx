"use client";
import { useMemo } from "react";
import Scene from "./SceneLoader";
import { useRun } from "./useRun";
import { AgentFeed, BalanceSheet, BondGauge, ButtonRing, ChainFeed, JobList, LeaseBar, Narration, PolicyCard } from "./Panels";
import type { Side } from "@/engine/types";

export function RunView({ side, title, intro }: { side: Exclude<Side, "attack">; title: string; intro: string }) {
  const { state, start, stop, reset } = useRun(side);
  const m = state.machine;
  const breached = useMemo(() => state.attacks.some((a) => a.name.toLowerCase().includes("redirect") || a.name.toLowerCase().includes("geofence")) && state.txs.some((t) => t.kind === "slash"), [state.attacks, state.txs]);
  const lastIntent = state.intents[0];

  return (
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="serif text-4xl md:text-5xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-2">{intro}</p>
        </div>
        <div className="flex items-center gap-2">
          {!state.running ? <button className="btn btn-teal" onClick={() => start(false)}>Start the run</button> : <button className="btn btn-ghost" onClick={stop}>Stop</button>}
          <button className="btn btn-ghost" onClick={() => start(true)} disabled={state.running}>Fast run</button>
          <button className="btn btn-ghost" onClick={reset} disabled={state.running}>Clear</button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
        <section className="card-dark grain grain-dark relative overflow-hidden" style={{ minHeight: 520 }}>
          <div className="absolute inset-0"><Scene side={side} machine={m} txs={state.txs} jobs={state.jobs} breached={breached} /></div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
            <div className="pointer-events-auto rounded-2xl border border-white/10 bg-night/80 p-4 backdrop-blur">
              <div className="mb-1 flex items-center justify-between text-[11px] text-[#9fb5b1]">
                <span>{m ? `${m.name}, ${m.status}` : "Scene"}</span>
                <span>{state.txs[0]?.simulated === false ? "Base Sepolia" : "simulated chain, labelled"}</span>
              </div>
              <Narration lines={state.narration} />
              {state.done ? <div className="mt-2 text-sm text-glow">{state.done}</div> : null}
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="card p-4"><BalanceSheet m={m} series={state.balanceSeries} /></div>
          <div className="card p-4"><BondGauge value={m?.bond ?? 0} min={m?.bondMin ?? 0} slashes={m?.slashes ?? 0} /></div>
          <div className="card p-4"><LeaseBar m={m} /></div>
          {state.button ? <div className="card p-4"><ButtonRing b={state.button} /></div> : null}
        </aside>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card flex flex-col p-4">
          <h2 className="mb-3 text-sm font-semibold">Agents talking</h2>
          <div className="flex flex-col"><AgentFeed messages={state.messages} /></div>
        </section>
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Policy engine, last decision</h2>
          <PolicyCard decision={state.decisions[0]} intent={lastIntent} />
          {state.attacks.length ? (
            <div className="mt-4 border-t border-line pt-3">
              <h3 className="mb-2 text-sm font-semibold">Attacks in this run</h3>
              <ul className="flex flex-col gap-1 text-sm">{state.attacks.map((a, i) => <li key={i} className="flex gap-2"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${a.blocked ? "bg-teal" : "bg-rust"}`} /><span><span className="font-medium">{a.name}</span> <span className="text-muted">{a.where}: {a.detail}</span></span></li>)}</ul>
            </div>
          ) : null}
        </section>
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Chain feed</h2>
          <div className="scroll-thin max-h-[420px] overflow-auto pr-1"><ChainFeed txs={state.txs} /></div>
        </section>
      </div>

      <section className="card mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold">Jobs</h2>
        <JobList jobs={state.jobs} />
      </section>
    </div>
  );
}
