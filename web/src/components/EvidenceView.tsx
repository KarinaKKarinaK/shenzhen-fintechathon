"use client";
import type { ReactNode } from "react";
import { JudgeConsole } from "./JudgeConsole";
import { LastRun, useAttackSet } from "./EvidenceLab";
import { AttackGrid, naiveFell, type AttackResult } from "./AttackGrid";
import { useLang } from "@/i18n/LangProvider";
import { LearnedComponents } from "./Learned";
import { Monitors } from "./Monitors";

// Base Sepolia, block 48335911, source verified on Sourcify. Same values in contracts/deployments/base-sepolia.json.
const DEPLOYED: Record<string, string> = {
  IntentLog: "0x093eD0DD8E4bE4b0205a6e39d0c5988f5Cd8ad51",
  Bond: "0x14cDb3Dd28C9F2F39Fe49FE8c319f113a3F58754",
  JobBoard: "0xB4C2A66F3CD59b9D2BF4D4D070BB07eB6f11Bb4A",
  Lease: "0x0D21c8f6C1e6e6EA2ae5fF073F51fC4d57AC5ed2",
};
const CONTRACT_NAMES = ["Bond", "IntentLog", "JobBoard", "Lease"];
const API_LINES: [string, string][] = [["GET", "/api/attacks"], ["GET", "/api/run?scenario=fleet&fast=1&lang=zh"], ["POST", "/api/judge"]];

function Row({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="group border-b border-line last:border-b-0" open={open}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden"><span className="tech text-[10px] text-red transition group-open:rotate-90">&#9656;</span>{title}</summary>
      <div className="px-4 pb-4 text-sm">{children}</div>
    </details>
  );
}

function Stat({ label, value, tone, title }: { label: string; value: string; tone?: string; title?: string }) {
  return <div className="tile !px-3 !py-2" title={title}><div className="text-[10px] uppercase tracking-wide text-muted">{label}</div><div className={`tech text-lg font-bold leading-tight ${tone ?? ""}`}>{value}</div></div>;
}

export function EvidenceView({ results: initial, benign: benign0, chainReal, modelReal }: { results: AttackResult[]; benign?: { passed: number; total: number }; chainReal: boolean; modelReal: boolean }) {
  const { d, t } = useLang();
  const E = d.evidence;
  const { results, benign, running, start, stop, status } = useAttackSet(initial, benign0);
  const blocked = results.filter((r) => r.blocked).length;
  const fell = results.filter((r) => naiveFell(r) === true).length;
  const naiveKnown = results.some((r) => r.naive !== undefined);
  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="display text-4xl md:text-5xl">{E.title}</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-2">{E.sub}</p>

      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label={E.strip.blocked} value={t("evidence.ofN", { b: blocked, n: results.length })} tone={blocked === results.length ? "text-gold-deep" : "text-red"} />
        <Stat label={E.strip.benign} value={benign ? t("evidence.ofN", { b: benign.passed, n: benign.total }) : d.grid.runSet} />
        <Stat label={E.strip.naive} value={t("evidence.ofN", { b: naiveKnown ? fell : "?", n: results.length })} tone="text-red" />
        <Stat label={E.chainMode} value={chainReal ? E.chainShortReal : E.chainShortSim} title={chainReal ? E.chainReal : E.chainSim} />
        <Stat label={E.modelMode} value={modelReal ? E.modelShortReal : E.modelShortSim} title={modelReal ? E.modelReal : E.modelSim} />
      </div>

      <section className="aurora aurora-cream card mt-4 p-5"><JudgeConsole /></section>

      <section className="card mt-4 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-sm font-semibold">{d.lab.title}</h2><span className="text-xs text-muted">{status ?? d.lab.request}</span></div>
          {!running ? <button className="btn btn-red !px-3 !py-2 !text-[11px]" onClick={start}>{d.lab.run}</button> : <button className="btn btn-ghost !px-3 !py-2 !text-[11px]" onClick={stop}>{d.lab.stop}</button>}
        </div>
        <AttackGrid results={results} />
      </section>

      <section className="card mt-4">
        <Row title={E.learnedTitle} open><p className="mb-3 text-xs text-muted">{E.learnedNote}</p><LearnedComponents /></Row>
        <Row title={E.monitorsTitle}><p className="mb-3 text-xs text-muted">{E.monitorsNote}</p><Monitors /></Row>
        <Row title={E.contractsTitle}>
          <p className="mb-3 text-xs text-muted">{E.contractsStatus}</p>
          <ul className="flex flex-col divide-y divide-line">
            {E.contracts.map((what, i) => <li key={CONTRACT_NAMES[i]} className="flex flex-wrap gap-x-3 gap-y-1 py-2"><span className="mono w-20 shrink-0 text-red">{CONTRACT_NAMES[i]}</span><span className="min-w-0 flex-1 text-ink-2">{what}</span><a className="link shrink-0 text-xs" href={`https://sepolia.basescan.org/address/${DEPLOYED[CONTRACT_NAMES[i]]}`} target="_blank" rel="noreferrer">{E.onBasescan}</a></li>)}
          </ul>
          <p className="mt-2 text-xs text-muted">{E.contractsGap}</p>
        </Row>
        <Row title={E.lastRun}><LastRun /></Row>
        <Row title={E.checkTitle}>
          <p className="text-ink-2">{E.cannotBody}<span className="mono text-red">npx tsx src/engine/selfcheck.ts</span>{E.cannotAfter}</p>
          <ul className="mt-3 flex flex-col gap-1 text-xs">{API_LINES.map(([m, p], i) => <li key={p} className="flex flex-wrap gap-x-3"><span className="mono text-red">{m} {p}</span><span className="text-muted">{[E.verifyAttacks, E.verifyRun, E.verifyJudge][i]}</span></li>)}</ul>
        </Row>
      </section>
    </div>
  );
}
