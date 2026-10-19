"use client";
import type { ReactNode } from "react";
import { JudgeConsole } from "./JudgeConsole";
import { LastRun, useAttackSet } from "./EvidenceLab";
import { AttackGrid, naiveFell, type AttackResult } from "./AttackGrid";
import { useLang } from "@/i18n/LangProvider";
import { LearnedComponents } from "./Learned";

const CONTRACT_NAMES = ["Bond", "JobBoard", "Lease"];
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
        <Row title={E.contractsTitle}>
          <div className="overflow-x-auto">
            <table className="passbook w-full text-xs">
              <thead><tr><th className="text-left">{E.thContract}</th><th className="text-left">{E.thHolds}</th><th className="text-left">{E.thStatus}</th></tr></thead>
              <tbody>
                {E.contracts.map(([p, gap], i) => (
                  <tr key={CONTRACT_NAMES[i]} className="align-top">
                    <td className="whitespace-nowrap">{CONTRACT_NAMES[i]}</td>
                    <td className="min-w-[16rem]"><div className="text-ink">{p}</div><div className="mt-0.5 text-muted">{E.knownGap}{gap}</div></td>
                    <td><span className="flex flex-wrap gap-1 text-[10px]"><span className="pill bg-gold text-ink">{E.written}</span><span className="pill bg-paper-2 text-muted">{E.notCompiled}</span><span className="pill bg-paper-2 text-muted">{E.notDeployed}</span></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">{E.contractsNote}</p>
        </Row>
        <Row title={E.lastRun}><LastRun /></Row>
        <Row title={E.cannotTitle}><p className="text-ink-2">{E.cannotBody}<span className="mono text-red">npx tsx src/engine/selfcheck.ts</span>{E.cannotAfter}</p></Row>
        <Row title={E.verifyTitle}>
          <div className="overflow-x-auto">
            <table className="passbook w-full text-xs">
              <thead><tr><th className="text-left">{E.thCall}</th><th className="text-left">{E.thWhat}</th></tr></thead>
              <tbody>{API_LINES.map(([m, p], i) => <tr key={p}><td className="whitespace-nowrap">{m} {p}</td><td className="text-ink-2">{[E.verifyAttacks, E.verifyRun, E.verifyJudge][i]}</td></tr>)}</tbody>
            </table>
          </div>
        </Row>
      </section>
    </div>
  );
}
