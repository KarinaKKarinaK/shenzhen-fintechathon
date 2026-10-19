"use client";
import { captureDemoToken } from "./demoToken";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Scene from "./SceneLoader";
import { useRun } from "./useRun";
import { AgentFeed, BalanceSheet, BondGauge, ButtonRing, ChainFeed, JobList, LeaseBar, Narration, PlanCard, PlanTable, PolicyCard, ProofCard, TelemetryCard, VendorBond } from "./Panels";
import { CashFlow, EventStream, RuleHits, UnitEconomics } from "./Graphs";
import { KpiTiles } from "./Kpis";
import { Moments, momentsOf, type MomentKey } from "./Moments";
import type { Side } from "@/engine/types";
import { useLang } from "@/i18n/LangProvider";
import { layerLabel } from "@/engine/i18n";

// The details, one question per tab: where the money goes, what was stopped, what the drone chose to do, the raw record.
const TABS = ["money", "safety", "jobs", "log"] as const;
type Tab = (typeof TABS)[number];

export function RunView({ side }: { side: Exclude<Side, "attack"> }) {
  const { d, t, lang } = useLang();
  const { state, start, stop, reset, append } = useRun(side, lang);
  const R = d.run;
  const title = side === "fleet" ? d.fleet.title : d.neighbour.title;
  const intro = side === "fleet" ? d.fleet.intro : d.neighbour.intro;
  const m = state.machine;
  const slashTxs = state.txs.filter((x) => x.kind === "slash");
  // The fence only breaks on a geofence slash. Any slash still lights the vault red.
  const breached = useMemo(() => state.proofs.some((p) => p.rule === "geofence") || slashTxs.some((x) => /geofence/i.test(x.label)), [state.proofs, slashTxs]);
  const slashed = slashTxs.length > 0;
  const elapsed = state.events.length ? (state.events[state.events.length - 1].at - state.events[0].at) / 1000 : 0;
  const [realReady, setRealReady] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setRealReady(captureDemoToken()); }, []);
  const chainMode = state.txs[0]?.simulated === false ? "Base Sepolia" : realReady && state.txs.length === 0 ? "Base Sepolia, armed" : R.simulated;
  const modelMode = state.model ?? (state.messages.some((x) => x.source === "model") ? "Claude" : R.scripted);
  const frozen = m?.status === "frozen";
  const lastJob = Object.values(state.jobs).slice(-1)[0];
  const eco = state.economics.last ?? (lastJob ? state.economics[lastJob.id] : undefined);
  const sol = state.solvency.last;
  const tel = state.telemetry.last;
  const proof = state.proofs[state.proofs.length - 1];
  const log = proof?.intentHash ? state.logs[proof.intentHash] : undefined;

  // A finished run was narrated in one language. When the language changes while idle, fetch it again
  // in the new one, at the speed it was run. A run in progress is left alone.
  const prevLang = useRef(lang);
  useEffect(() => {
    if (prevLang.current === lang) return;
    prevLang.current = lang;
    if (!state.running && state.events.length && state.lang !== lang) start(state.fast ?? true);
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Five moments. The newest one takes the caption as it lands; a click pins an earlier one until the next lands.
  const moments = useMemo(() => momentsOf(state.events, lang), [state.events, lang]);
  const lit = moments.filter((x) => typeof x.at === "number");
  const latest = lit.length ? lit.reduce((a, b) => ((b.at ?? 0) > (a.at ?? 0) ? b : a)).key : null;
  const [pick, setPick] = useState<{ key: MomentKey; n: number } | null>(null);
  const active = pick && pick.n === lit.length ? pick.key : latest;
  const pinned = moments.find((x) => x.key === active)?.text;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("money");


  return (
    <div className="mx-auto max-w-[1560px]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="tech text-[11px] tracking-[0.25em] text-red">{side === "fleet" ? R.eyebrowFleet : R.eyebrowNeighbour}</div>
          <h1 className="display text-4xl md:text-5xl">{title}</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-2">{intro}</p>
          {side === "fleet" ? <Link href="/app/live" className="link mt-2 inline-block text-sm">{R.yourData}</Link> : null}
        </div>
        <div className="flex items-center gap-2">
          {!state.running ? <button className="btn btn-red" onClick={() => start(false)}>{R.start}</button> : <button className="btn btn-ghost" onClick={stop}>{R.stop}</button>}
          <button className="btn btn-ghost" onClick={() => start(true)} disabled={state.running}>{R.fast}</button>
          <button className="btn btn-ghost" onClick={reset} disabled={state.running}>{R.clear}</button>
        </div>
      </header>

      <div className="mb-4"><Moments moments={moments} active={active} onSelect={(key) => setPick({ key, n: lit.length })} /></div>

      <div className="mb-4"><KpiTiles m={m} /></div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
        <section className="aurora aurora-cream card cut relative min-h-[420px] md:min-h-[640px]">
          <span className="bracket left-3 top-3 z-10 border-t border-l" /><span className="bracket right-3 top-3 z-10 border-t border-r" /><span className="bracket bottom-3 left-3 z-10 border-b border-l" /><span className="bracket bottom-3 right-3 z-10 border-b border-r" />
          <div className="absolute inset-0 overflow-hidden"><Scene side={side} machine={m} txs={state.txs} jobs={state.jobs} breached={breached} slashed={slashed} frozen={frozen} worst={sol?.worst} telemetry={tel} geofence={lastJob?.geofence} /></div>
          <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-wrap gap-2">
            <span className="pill bg-white/90 text-ink backdrop-blur">{m ? `${m.name}: ${R.status[m.status] ?? m.status}` : R.scene}</span>
            <span className="pill bg-white/85 text-ink backdrop-blur">{t("run.chain", { mode: chainMode })}</span>
            <span className="pill bg-white/85 text-ink backdrop-blur">{t("run.model", { mode: modelMode })}</span>
            {frozen ? <span className="pill bg-red text-white">{R.frozen}</span> : null}
            {state.running ? <span className="pill bg-red text-white">{R.live}</span> : null}
          </div>
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20">
            <div className="pointer-events-auto bg-white/96 p-4 backdrop-blur" style={{ borderLeft: "4px solid #c8102e" }}>
              <Narration lines={state.narration} pinned={pinned} />
              {state.done ? <div className="mt-2 flex items-center gap-3"><span className="seal stamp tech px-2 py-1 text-[11px] tracking-[0.15em]">已验证 VERIFIED</span><span className="text-sm font-semibold text-red-deep">{state.done}</span></div> : null}
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="card p-4"><h2 className="mb-3 text-sm font-semibold">{R.proofTitle}</h2><ProofCard proof={proof} log={log} /></section>
          {state.button ? <section className="card p-4"><h2 className="mb-3 text-sm font-semibold">{R.buttonTitle}</h2><ButtonRing b={state.button} scenario={side} onEvents={append} /></section> : null}
          <section className="card p-4"><LeaseBar m={m} /></section>
        </aside>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-y border-line py-2">
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="run-details">{open ? R.hide : R.details}</button>
        <span className="mono text-muted">{t("run.meta", { n: state.events.length, s: elapsed.toFixed(1), tx: state.txs.length })}</span>
      </div>

      {open ? (
        <div id="run-details" className="mt-4">
          <div role="tablist" aria-label={R.details} className="flex flex-wrap gap-2">
            {TABS.map((k) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`btn ${tab === k ? "btn-red" : "btn-ghost"}`}>{R.tabs[k]}</button>)}
          </div>
          <p className="mt-2 text-sm text-muted">{R.tabNotes[tab]}</p>

          {tab === "money" ? (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <section className="card p-4"><UnitEconomics eco={eco} title={lastJob?.title} /></section>
              <section className="card p-4"><BalanceSheet m={m} series={state.balanceSeries} /><div className="mt-4 border-t border-line pt-3"><CashFlow txs={state.txs} /></div></section>
              <section className="card p-4"><BondGauge value={m?.bond ?? 0} min={m?.bondMin ?? 0} slashes={m?.slashes ?? 0} side={side} solvency={sol} /><div className="mt-4 border-t border-line pt-3"><VendorBond m={m} /></div></section>
            </div>
          ) : null}

          {tab === "safety" ? (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <section className="card p-4"><h2 className="mb-3 text-sm font-semibold">{R.policyTitle}</h2><div className="scroll-thin max-h-[480px] overflow-auto pr-1"><PolicyCard decisions={state.decisions} intents={state.intents} /></div></section>
              <section className="card p-4">
                <h2 className="mb-2 text-sm font-semibold">{R.attacksInRun}</h2>
                {state.attacks.length ? <ul className="flex flex-col gap-2 text-sm">{state.attacks.map((a, i) => <li key={i} className="flex gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.blocked ? "bg-gold" : "bg-red"}`} /><span className="min-w-0"><span className="font-medium">{lang === "zh" ? a.nameZh ?? a.name : a.name}</span><span className="block text-xs text-muted">{t(a.blocked ? "run.stoppedBy" : "run.passedAt", { where: layerLabel(lang, a.where) })}</span></span></li>)}</ul> : <div className="text-sm text-muted">{R.noAttacks}</div>}
                <div className="mt-4 border-t border-line pt-3"><TelemetryCard t={tel} /></div>
              </section>
              <section className="card p-4"><RuleHits decisions={state.decisions} /></section>
            </div>
          ) : null}

          {tab === "jobs" ? (
            <section className="card mt-4 p-4">
              <PlanCard plan={state.plan} meta={state.planMeta} />
              <div className="mt-4">{state.plan?.length ? <PlanTable plan={state.plan} jobs={state.jobs} /> : <JobList jobs={state.jobs} />}</div>
            </section>
          ) : null}

          {tab === "log" ? (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <section className="card p-4"><h2 className="mb-3 text-sm font-semibold">{R.agentsTitle}</h2><div className="scroll-thin flex max-h-[520px] flex-col overflow-auto pr-1"><AgentFeed messages={state.messages} gates={state.gates} understood={state.understood} frozen={frozen} /></div></section>
              <section className="card p-4"><h2 className="mb-3 text-sm font-semibold">{R.chainFeed}</h2><div className="scroll-thin max-h-[520px] overflow-auto pr-1"><ChainFeed txs={state.txs} /></div></section>
              <aside className="aurora aurora-black card-dark flex flex-col p-4" style={{ maxHeight: 600 }}>
                <div className="mb-2 flex items-center justify-between"><h2 className="tech text-[11px] tracking-[0.2em] text-gold">{R.eventStream}</h2><Link href="/app/evidence" className="mono text-white/60 underline decoration-gold">{R.evidenceLink}</Link></div>
                <div className="scroll-thin min-h-0 flex-1 overflow-auto bg-black/55 p-3 backdrop-blur-sm"><EventStream events={state.events} dark /></div>
              </aside>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
