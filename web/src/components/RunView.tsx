"use client";
import { useMemo } from "react";
import Scene from "./SceneLoader";
import { useRun } from "./useRun";
import { AgentFeed, BalanceSheet, BondGauge, ButtonRing, ChainFeed, JobList, LeaseBar, Narration, PolicyCard } from "./Panels";
import { BondHistory, CashFlow, EventRate, EventStream, RuleHits } from "./Graphs";
import type { Side } from "@/engine/types";

export function RunView({ side, title, intro }: { side: Exclude<Side, "attack">; title: string; intro: string }) {
  const { state, start, stop, reset } = useRun(side);
  const m = state.machine;
  const breached = useMemo(() => state.txs.some((t) => t.kind === "slash"), [state.txs]);
  const elapsed = state.events.length ? (state.events[state.events.length - 1].at - state.events[0].at) / 1000 : 0;
  const rate = elapsed > 0 ? state.events.length / elapsed : 0;
  const blocked = state.attacks.filter((a) => a.blocked).length;
  const chainMode = state.txs[0]?.simulated === false ? "Base Sepolia" : "simulated";

  const kpis = [
    { label: "Balance", value: (m?.balance ?? 0).toFixed(1) },
    { label: "Bond", value: `${(m?.bond ?? 0).toFixed(0)} / ${m?.bondMin ?? 0}` },
    { label: "Lease left", value: (m?.leaseBalance ?? 0).toFixed(1) },
    { label: "Tasks paid", value: String(m?.tasksDone ?? 0) },
    { label: "Transactions", value: String(state.txs.length) },
    { label: "Attacks blocked", value: `${blocked} / ${state.attacks.length}` },
    { label: "Events / s", value: rate.toFixed(1) },
  ];

  return (
    <div className="mx-auto max-w-[1560px]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-muted">{side === "fleet" ? "Agricultural drone on hire purchase" : "Household humanoid"}</div>
          <h1 className="display text-4xl md:text-5xl">{title}</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-2">{intro}</p>
        </div>
        <div className="flex items-center gap-2">
          {!state.running ? <button className="btn btn-red" onClick={() => start(false)}>Start</button> : <button className="btn btn-ghost" onClick={stop}>Stop</button>}
          <button className="btn btn-ghost" onClick={() => start(true)} disabled={state.running}>Fast</button>
          <button className="btn btn-ghost" onClick={reset} disabled={state.running}>Clear</button>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {kpis.map((k) => (<div key={k.label} className="tile"><div className="text-xs text-muted">{k.label}</div><div className="kpi mt-1 tabular-nums">{k.value}</div></div>))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,1fr)]">
        <section className="aurora aurora-cream card cut relative" style={{ minHeight: 560 }}>
          <span className="bracket left-3 top-3 z-10 border-t border-l" /><span className="bracket right-3 top-3 z-10 border-t border-r" /><span className="bracket bottom-3 left-3 z-10 border-b border-l" /><span className="bracket bottom-3 right-3 z-10 border-b border-r" />
          <div className="absolute inset-0 overflow-hidden"><Scene side={side} machine={m} txs={state.txs} jobs={state.jobs} breached={breached} /></div>
          <div className="pointer-events-none absolute left-4 top-4 flex gap-2">
            <span className="pill bg-white/90 text-ink backdrop-blur">{m ? `${m.name}: ${m.status}` : "scene"}</span>
            <span className="pill bg-white/85 text-ink backdrop-blur">chain: {chainMode}</span>
            {state.running ? <span className="pill bg-red text-white">live</span> : null}
          </div>
          <div className="pointer-events-none absolute inset-x-4 bottom-4">
            <div className="pointer-events-auto bg-white/92 p-4 backdrop-blur" style={{ borderLeft: "4px solid #c8102e" }}>
              <Narration lines={state.narration} />
              {state.done ? <div className="mt-2 flex items-center gap-3"><span className="seal stamp tech px-2 py-1 text-[11px] tracking-[0.15em]">已验证 VERIFIED</span><span className="text-sm font-semibold text-red-deep">{state.done}</span></div> : null}
            </div>
          </div>
        </section>

        <aside className="aurora aurora-black card-dark flex flex-col p-4" style={{ maxHeight: 560 }}>
          <div className="mb-2 flex items-center justify-between"><h2 className="tech text-[11px] tracking-[0.2em] text-gold">EVENT STREAM</h2><span className="mono text-white/60">{state.events.length} events, {elapsed.toFixed(1)} s</span></div>
          <div className="scroll-thin min-h-0 flex-1 overflow-auto bg-black/55 p-3 backdrop-blur-sm"><EventStream events={state.events} dark /></div>
        </aside>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section className="card p-4"><CashFlow txs={state.txs} /></section>
        <section className="card p-4"><BondHistory events={state.events} /></section>
        <section className="card p-4"><RuleHits decisions={state.decisions} /></section>
        <section className="card p-4"><EventRate events={state.events} /><div className="mt-3"><BalanceSheet m={m} series={state.balanceSeries} /></div></section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-4"><h2 className="mb-3 text-sm font-semibold">Agents talking</h2><div className="flex flex-col"><AgentFeed messages={state.messages} /></div></section>
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Policy engine, last decision</h2>
          <PolicyCard decision={state.decisions[0]} intent={state.intents[0]} />
          {state.attacks.length ? (<div className="mt-4 border-t border-line pt-3"><h3 className="mb-2 text-sm font-semibold">Attacks in this run</h3><ul className="flex flex-col gap-1 text-sm">{state.attacks.map((a, i) => <li key={i} className="flex gap-2"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${a.blocked ? "bg-gold" : "bg-red"}`} /><span><span className="font-medium">{a.name}</span> <span className="text-muted">{a.where}: {a.detail}</span></span></li>)}</ul></div>) : null}
        </section>
        <section className="card p-4"><h2 className="mb-3 text-sm font-semibold">Chain feed</h2><div className="scroll-thin max-h-[420px] overflow-auto pr-1"><ChainFeed txs={state.txs} /></div></section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-4"><BondGauge value={m?.bond ?? 0} min={m?.bondMin ?? 0} slashes={m?.slashes ?? 0} /></section>
        <section className="card p-4"><LeaseBar m={m} />{state.button ? <div className="mt-4"><ButtonRing b={state.button} /></div> : null}</section>
        <section className="card p-4"><h2 className="mb-3 text-sm font-semibold">Jobs</h2><JobList jobs={state.jobs} /></section>
      </div>
    </div>
  );
}
