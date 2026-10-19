"use client";
import { useMemo } from "react";
import Link from "next/link";
import Scene from "./SceneLoader";
import { useRun } from "./useRun";
import { AgentFeed, BalanceSheet, BondGauge, ButtonRing, ChainFeed, JobList, LeaseBar, Narration, PlanTable, PolicyCard, ProofCard, TelemetryCard } from "./Panels";
import { BondHistory, CashFlow, EventStream, RuleHits, UnitEconomics } from "./Graphs";
import { Stages } from "./Stages";
import { Ticker } from "./Ticker";
import { CountUp } from "./CountUp";
import type { Side } from "@/engine/types";

export function RunView({ side, title, intro }: { side: Exclude<Side, "attack">; title: string; intro: string }) {
  const { state, start, stop, reset, append } = useRun(side);
  const m = state.machine;
  const slashTxs = state.txs.filter((t) => t.kind === "slash");
  // The fence only breaks on a geofence slash. Any slash still lights the vault red.
  const breached = useMemo(() => state.proofs.some((p) => p.rule === "geofence") || slashTxs.some((t) => /geofence/i.test(t.label)), [state.proofs, slashTxs]);
  const slashed = slashTxs.length > 0;
  const elapsed = state.events.length ? (state.events[state.events.length - 1].at - state.events[0].at) / 1000 : 0;
  const chainMode = state.txs[0]?.simulated === false ? "Base Sepolia" : "simulated";
  const modelMode = state.model ?? (state.messages.some((x) => x.source === "model") ? "Claude" : "scripted");
  const frozen = m?.status === "frozen";

  const gateBlocked = Object.values(state.gates).filter((g) => g.action && g.action !== "pass").length;
  const policyBlocked = state.decisions.filter((d) => d.verdict !== "allow").length;
  const contractBlocked = Math.max(state.proofs.length, slashTxs.length);
  const real = state.txs.filter((t) => !t.simulated).length, sim = state.txs.length - real;
  const hunter = state.txs.filter((t) => t.kind === "bounty").reduce((a, t) => a + t.amount, 0);
  const titleTx = state.txs.find((t) => t.kind === "title");
  const owner = m?.owned || titleTx ? "operator" : "lender";
  const lastJob = Object.values(state.jobs).slice(-1)[0];
  const eco = state.economics.last ?? (lastJob ? state.economics[lastJob.id] : undefined);
  const sol = state.solvency.last;
  const tel = state.telemetry.last;
  const proof = state.proofs[state.proofs.length - 1];

  const kpis: Array<{ label: string; value: React.ReactNode; sub?: string }> = [
    { label: "Balance", value: <CountUp value={m?.balance ?? 0} /> },
    { label: "Bond", value: <><CountUp value={m?.bond ?? 0} decimals={0} /> / {m?.bondMin ?? 0}</> },
    { label: "Lease left", value: <CountUp value={m?.leaseBalance ?? 0} /> },
    { label: "Tasks paid", value: String(m?.tasksDone ?? 0) },
    { label: "Hunter wallet", value: <CountUp value={hunter} />, sub: "bounties paid" },
    { label: "Title", value: <span className={owner === "operator" ? "text-gold-deep" : ""}>{owner}</span>, sub: titleTx ? "moved on chain" : "held by the lender" },
    { label: "Layers", value: <span className="text-base">gate {gateBlocked} · policy {policyBlocked} · contract {contractBlocked}</span>, sub: "blocked at each layer" },
    { label: "Hashes", value: <span className="text-base">{real} real · {sim} sim</span>, sub: chainMode },
  ];

  const other = side === "fleet" ? { href: "/app/neighbour", label: "Neighbour" } : { href: "/app/fleet", label: "Fleet" };

  return (
    <div className="page">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>{side === "fleet" ? "Side A, agricultural drone on hire purchase" : "Side B, household humanoid"}</span>
            <span className="inline-flex overflow-hidden rounded-sm border border-line text-[12px] tracking-wider">
              <span className="bg-red px-2 py-0.5 text-white">{side}</span>
              <Link href={other.href} className="px-2 py-0.5 text-ink-2 hover:bg-gold-soft">{other.label}</Link>
            </span>
          </div>
          <h1 className="display text-4xl md:text-5xl">{title}</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-2">{intro}</p>
        </div>
        <div className="flex items-center gap-2">
          {!state.running ? <button className="btn btn-red" onClick={() => start(false)}>Start</button> : <button className="btn btn-ghost" onClick={stop}>Stop</button>}
          <button className="btn btn-ghost" onClick={() => start(true)} disabled={state.running}>Fast</button>
          <button className="btn btn-ghost" onClick={reset} disabled={state.running}>Clear</button>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {kpis.map((k) => (<div key={k.label} className="tile"><div className="text-[13px] text-muted">{k.label}</div><div className="kpi mt-1 tabular-nums">{k.value}</div>{k.sub ? <div className="mt-0.5 text-[12px] text-muted">{k.sub}</div> : null}</div>))}
      </div>

      <div className="mb-4"><Stages events={state.events} solvency={sol} /></div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,1fr)]">
        <section className="card relative" style={{ minHeight: 640 }}>
          
          <div className="absolute inset-0 overflow-hidden"><Scene side={side} machine={m} txs={state.txs} jobs={state.jobs} breached={breached} slashed={slashed} frozen={frozen} worst={sol?.worst} telemetry={tel} geofence={lastJob?.geofence} /></div>
          <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
            <span className="pill bg-surface text-ink">{m ? `${m.name}: ${m.status}` : "scene"}</span>
            <span className="pill bg-surface text-ink">chain: {chainMode}</span>
            <span className="pill bg-surface text-ink">model: {modelMode}</span>
            {frozen ? <span className="pill bg-red text-white">frozen</span> : null}
            {state.running ? <span className="pill bg-red text-white">live</span> : null}
          </div>
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20">
            <div className="pointer-events-auto bg-surface p-4" style={{ borderLeft: "4px solid #B8322A" }}>
              <Narration lines={state.narration} />
              {state.done ? <div className="mt-2 flex items-center gap-3"><span className="seal stamp px-2 py-1 text-[12px]">已验证 VERIFIED</span><span className="text-sm font-semibold text-red-deep">{state.done}</span></div> : null}
            </div>
          </div>
        </section>

        <aside className="card flex flex-col p-4" style={{ maxHeight: 560 }}>
          <div className="mb-2 flex items-center justify-between"><h2 className="text-lg">Event stream</h2><span className="mono text-ink-2">{state.events.length} events, {elapsed.toFixed(1)} s</span></div>
          <div className="scroll-thin min-h-0 flex-1 overflow-auto p-3"><EventStream events={state.events} /></div>
        </aside>
      </div>

      <div className="mt-4"><Ticker txs={state.txs} /></div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section className="card p-4"><UnitEconomics eco={eco} title={lastJob?.title} /></section>
        <section className="card p-4"><BondHistory events={state.events} /></section>
        <section className="card p-4"><RuleHits decisions={state.decisions} /></section>
        <section className="card p-4"><CashFlow txs={state.txs} /><div className="mt-3"><BalanceSheet m={m} series={state.balanceSeries} /></div></section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-4"><h2 className="mb-3 text-sm font-semibold">Agents talking</h2><div className="scroll-thin flex max-h-[560px] flex-col overflow-auto pr-1"><AgentFeed messages={state.messages} gates={state.gates} understood={state.understood} frozen={frozen} /></div></section>
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Policy engine, last five decisions</h2>
          <div className="scroll-thin max-h-[560px] overflow-auto pr-1"><PolicyCard decisions={state.decisions} intents={state.intents} /></div>
          {state.attacks.length ? (<div className="mt-4 border-t border-line pt-3"><h3 className="mb-2 text-sm font-semibold">Attacks in this run</h3><ul className="flex flex-col gap-1 text-sm">{state.attacks.map((a, i) => <li key={i} className="flex gap-2"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${a.blocked ?"bg-gold":"bg-red"}`} /><span><span className="font-medium">{a.name}</span> <span className="text-muted">{a.where}: {a.detail}</span></span></li>)}</ul></div>) : null}
        </section>
        <section className="card p-4"><h2 className="mb-3 text-sm font-semibold">Chain feed</h2><div className="scroll-thin max-h-[560px] overflow-auto pr-1"><ChainFeed txs={state.txs} /></div></section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-4"><h2 className="mb-3 text-sm font-semibold">Proof of violation</h2><ProofCard proof={proof} /></section>
        <section className="card p-4"><TelemetryCard t={tel} /></section>
        <section className="card p-4"><BondGauge value={m?.bond ?? 0} min={m?.bondMin ?? 0} slashes={m?.slashes ?? 0} side={side} solvency={sol} /></section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-4"><LeaseBar m={m} />{state.button ? <div className="mt-4"><ButtonRing b={state.button} scenario={side} onEvents={append} /></div> : null}</section>
        <section className="card p-4 lg:col-span-2"><h2 className="mb-3 text-sm font-semibold">Jobs</h2><PlanTable plan={state.plan} /><JobList jobs={state.jobs} /></section>
      </div>
    </div>
  );
}
