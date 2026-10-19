"use client";
import { JudgeConsole } from "./JudgeConsole";
import { EvidenceLab, LastRun } from "./EvidenceLab";
import type { AttackResult } from "./AttackGrid";
import { useLang } from "@/i18n/LangProvider";

// Five scored standards, the attack ids that exercise each. Names and panels come from the dictionary.
const STANDARD_IDS = ["7, 10, 13, 15", "3, 5", "1, 2, 4, 11, 16, 17, 18", "2, 9, 12", "19, 20"];
const CONTRACT_NAMES = ["Bond", "JobBoard", "Lease"];

export function EvidenceView({ results, benign, chainReal, modelReal }: { results: AttackResult[]; benign?: { passed: number; total: number }; chainReal: boolean; modelReal: boolean }) {
  const { d, t } = useLang();
  const E = d.evidence;
  const blocked = results.filter((r) => r.blocked).length;
  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="display text-4xl md:text-5xl">{E.title}</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-2">{E.sub}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-4"><div className="text-xs text-muted">{E.attackSet}</div><div className="kpi">{t("evidence.ofN", { b: blocked, n: results.length })}</div><div className="text-sm text-muted">{E.blockedAt}{benign ? t("evidence.benignPassed", { p: benign.passed, t: benign.total }) : ""}</div></div>
        <div className="card p-4"><div className="text-xs text-muted">{E.chainMode}</div><div className="mt-1 text-sm">{chainReal ? E.chainReal : E.chainSim}</div></div>
        <div className="card p-4"><div className="text-xs text-muted">{E.modelMode}</div><div className="mt-1 text-sm">{modelReal ? E.modelReal : E.modelSim}</div></div>
      </div>

      <section className="aurora aurora-cream card mt-4 p-5"><JudgeConsole /></section>

      <section className="card mt-4 p-4"><EvidenceLab initial={results} benign={benign} /></section>

      <section className="card mt-4 p-4 text-sm">
        <h2 className="mb-2 text-sm font-semibold">{E.standardsTitle}</h2>
        <table className="passbook w-full text-xs">
          <thead><tr><th className="text-left">{E.thStandard}</th><th className="text-left">{E.thIds}</th><th className="text-left">{E.thWhere}</th></tr></thead>
          <tbody>{E.standards.map(([s, panel], i) => <tr key={i}><td>{s}</td><td className="mono">{STANDARD_IDS[i]}</td><td className="text-ink-2">{panel}</td></tr>)}</tbody>
        </table>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="card p-4 text-sm">
          <h2 className="mb-2 text-sm font-semibold">{E.contractsTitle}</h2>
          <ul className="flex flex-col gap-2">
            {E.contracts.map(([p, gap], i) => (
              <li key={CONTRACT_NAMES[i]} className="cut-sm bg-paper-2 p-3">
                <div className="flex items-center justify-between"><span className="font-semibold">{CONTRACT_NAMES[i]}</span><span className="flex gap-1 text-[10px]"><span className="pill bg-gold text-ink">{E.written}</span><span className="pill bg-paper-2 text-muted">{E.notCompiled}</span><span className="pill bg-paper-2 text-muted">{E.notDeployed}</span></span></div>
                <div className="mt-1 text-ink-2">{p}</div>
                <div className="mt-1 text-xs text-muted">{E.knownGap}{gap}</div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">{E.contractsNote}</p>
        </section>
        <section className="card p-4"><LastRun /></section>
      </div>

      <section className="card mt-4 p-4 text-sm">
        <h2 className="mb-2 text-sm font-semibold">{E.cannotTitle}</h2>
        <p className="text-ink-2">{E.cannotBody}<span className="mono text-red">npx tsx src/engine/selfcheck.ts</span>{E.cannotAfter}</p>
      </section>

      <section className="card mt-4 p-4 text-sm">
        <h2 className="mb-2 text-sm font-semibold">{E.verifyTitle}</h2>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <li className="cut-sm bg-paper-2 p-3"><div className="mono text-red">GET /api/attacks</div><div className="text-ink-2">{E.verifyAttacks}</div></li>
          <li className="cut-sm bg-paper-2 p-3"><div className="mono text-red">GET /api/run?scenario=fleet&amp;fast=1&amp;lang=zh</div><div className="text-ink-2">{E.verifyRun}</div></li>
          <li className="cut-sm bg-paper-2 p-3"><div className="mono text-red">POST /api/judge</div><div className="text-ink-2">{E.verifyJudge}</div></li>
        </ul>
      </section>
    </div>
  );
}
