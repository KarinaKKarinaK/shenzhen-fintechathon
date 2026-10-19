"use client";
import { useMemo } from "react";
import Scene from "./SceneLoader";
import { useRun } from "./useRun";
import { AgentFeed, BalanceSheet, BondGauge, ButtonRing, ChainFeed, JobList, LeaseBar, Narration, PolicyCard } from "./Panels";
import { BondHistory, CashFlow, EventRate, EventStream, RuleHits } from "./Graphs";
import { Stages } from "./Stages";
import { CountUp } from "./CountUp";
import { Seal } from "./Logo";
import { Status } from "./StatusIcon";
import type { Side } from "@/engine/types";

export function RunView({ side, title, intro }: { side: Exclude<Side, "attack">; title: string; intro: string }) {
  const { state, start, stop, reset } = useRun(side);
  const m = state.machine;
  const breached = useMemo(() => state.txs.some((t) => t.kind === "slash"), [state.txs]);
  const elapsed = state.events.length ? (state.events[state.events.length - 1].at - state.events[0].at) / 1000 : 0;
  const rate = elapsed > 0 ? state.events.length / elapsed : 0;
  const blocked = state.attacks.filter((a) => a.blocked).length;
  const chainMode = state.txs[0]?.simulated === false ? "Base Sepolia" : "simulated";

  const kpis: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Balance", value: <CountUp value={m?.balance ?? 0} /> },
    { label: "Bond", value: <><CountUp value={m?.bond ?? 0} decimals={0} /> / {m?.bondMin ?? 0}</> },
    { label: "Lease left", value: <CountUp value={m?.leaseBalance ?? 0} /> },
    { label: "Tasks paid", value: String(m?.tasksDone ?? 0) },
    { label: "Transactions", value: String(state.txs.length) },
    { label: "Attacks blocked", value: `${blocked} / ${state.attacks.length}` },
    { label: "Events / s", value: rate.toFixed(1) },
  ];

  return (
    <div className="mx-auto max-w-[1440px]">
      <header className="flex flex-wrap items-end justify-between gap-4 py-6">
        <div>
          <div className="label">{side === "fleet" ? "Agricultural drone on hire purchase" : "Household humanoid"}</div>
          <h1 className="display mt-1 text-[39px]">{title}</h1>
          <p className="measure mt-2 text-lg text-ink-2">{intro}</p>
        </div>
        <div className="flex items-center gap-2">
          {!state.running ? <button className="btn btn-red" onClick={() => start(false)}>Start</button> : <button className="btn btn-ghost" onClick={stop}>Stop</button>}
          <button className="btn btn-ghost" onClick={() => start(true)} disabled={state.running}>Fast</button>
          <button className="btn btn-ghost" onClick={reset} disabled={state.running}>Clear</button>
        </div>
      </header>

      <div className="border-y border-rule py-6">
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {kpis.slice(0, 3).map((k) => (<div key={k.label}><dt className="label">{k.label}</dt><dd className="kpi kpi-lg mt-1">{k.value}</dd></div>))}
        </dl>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[15px]">
          {kpis.slice(3).map((k) => (<div key={k.label} className="flex items-baseline gap-2"><dt className="text-ink-2">{k.label}</dt><dd className="num font-semibold">{k.value}</dd></div>))}
        </dl>
      </div>

      <div className="py-6"><Stages events={state.events} /></div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,1fr)]">
        <section className="card relative overflow-hidden" style={{ minHeight: 560 }}>
          <div className="absolute inset-0 overflow-hidden"><Scene side={side} machine={m} txs={state.txs} jobs={state.jobs} breached={breached} /></div>
          <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-wrap gap-2">
            <span className="pill">{m ? `${m.name}: ${m.status}` : "scene"}</span>
            <span className="pill">chain: {chainMode}</span>
            {state.running ? <span className="pill" style={{ background: "var(--color-ink)", color: "#fff", borderColor: "var(--color-ink)" }}>live</span> : null}
          </div>
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10">
            <div className="pointer-events-auto rounded-md border border-rule bg-surface p-4">
              <Narration lines={state.narration} />
              {state.done ? <div className="mt-3 flex items-center gap-3"><span className="stamp inline-flex"><Seal size={40} title="Verified" /></span><span><span className="block font-semibold"><span lang="zh-Hans" className="cjk-sans">已验证</span> Verified</span><span className="block text-[15px] text-ink-2">{state.done}</span></span></div> : null}
            </div>
          </div>
        </section>

        <aside className="card flex flex-col p-5" style={{ maxHeight: 560 }}>
          <div className="mb-3 flex items-baseline justify-between gap-3"><h2 className="text-lg">Event stream</h2><span className="label"><span className="num">{state.events.length}</span> events, <span className="num">{elapsed.toFixed(1)}</span> s</span></div>
          <div className="scroll-thin min-h-0 flex-1 overflow-auto"><EventStream events={state.events} /></div>
        </aside>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <section className="card p-5"><CashFlow txs={state.txs} /></section>
        <section className="card p-5"><BondHistory events={state.events} /></section>
        <section className="card p-5"><RuleHits decisions={state.decisions} /></section>
        <section className="card p-5"><EventRate events={state.events} /><div className="mt-3"><BalanceSheet m={m} series={state.balanceSeries} /></div></section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card p-5"><h2 className="mb-3 text-lg">Agents talking</h2><div className="flex flex-col"><AgentFeed messages={state.messages} /></div></section>
        <section className="card p-5">
          <h2 className="mb-3 text-lg">Policy engine, last decision</h2>
          <PolicyCard decision={state.decisions[0]} intent={state.intents[0]} />
          {state.attacks.length ? (<div className="mt-5 border-t border-rule pt-4"><h3 className="mb-2 text-base">Attacks in this run</h3><ul className="flex flex-col gap-2 text-[15px]">{state.attacks.map((a, i) => <li key={i}><Status kind={a.blocked ? "ok" : "warn"}>{a.blocked ? "Blocked" : "Not blocked"}: {a.name}</Status><div className="text-ink-2">{a.where}: {a.detail}</div></li>)}</ul></div>) : null}
        </section>
        <section className="card p-5"><h2 className="mb-3 text-lg">Chain feed</h2><div className="scroll-thin max-h-[420px] overflow-auto pr-1"><ChainFeed txs={state.txs} /></div></section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card p-5"><BondGauge value={m?.bond ?? 0} min={m?.bondMin ?? 0} slashes={m?.slashes ?? 0} /></section>
        <section className="card p-5"><LeaseBar m={m} />{state.button ? <div className="mt-4"><ButtonRing b={state.button} /></div> : null}</section>
        <section className="card p-5"><h2 className="mb-3 text-lg">Jobs</h2><JobList jobs={state.jobs} /></section>
      </div>
    </div>
  );
}
