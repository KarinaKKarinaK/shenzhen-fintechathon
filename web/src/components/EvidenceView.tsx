"use client";
import { useEffect, useState, type ReactNode } from "react";
import { JudgeConsole } from "./JudgeConsole";
import { LastRun, useAttackSet } from "./EvidenceLab";
import { AttackGrid, naiveFell, type AttackResult } from "./AttackGrid";
import { useLang } from "@/i18n/LangProvider";
import { LearnedComponents } from "./Learned";
import { Monitors } from "./Monitors";

// Base Sepolia, block 48335911, source verified on Sourcify. Same values in contracts/deployments/base-sepolia.json.
const DEPLOYED: Record<string, string> = {
  IntentLog: "0x093eD0DD8E4bE4b0205a6e39d0c5988f5Cd8ad51",
  Bond: "0x6161f6e08c8695849e7A8aF74c39a5A1056d5435",
  JobBoard: "0xAbE83C0dD54EAd67DB63C8f9e854f00756f29952",
  Lease: "0x0D21c8f6C1e6e6EA2ae5fF073F51fC4d57AC5ed2",
};
const CONTRACT_NAMES = ["Bond", "IntentLog", "JobBoard", "Lease"];
// One full job against the deployed contracts on Base Sepolia (contracts/script/fulljob.sh base,
// contracts/deployments/base-sepolia-fulljob.json): call, role, value in wei, transaction.
const FULL_JOB: [string, string, string, string][] = [
  ["Bond.postVendorBond", "vendor", "20000000000", "0xf080cce89f89919ceb7a6de20f934385d2aa597c1239509f57cc01482e80d8f6"],
  ["Bond.register", "agent", "0", "0x5218a1052d2868ac3e50c9f605b5f25236a1f12402737424885713b886c8c53d"],
  ["Lease.open", "lender", "0", "0x8a0006519d34b1fb9817032e4e0003e58dd5bef4eb535e2a434ec48057bff04d"],
  ["JobBoard.post", "farmer", "100000000000", "0xc1d373ee3c7ad50c3b249ddcc40fb1551b847c00e8f4fbb4d51ddfec6778d899"],
  ["JobBoard.start", "agent", "0", "0x3f708c8be9b57f870ef2da16fe6df7087a7fd676bd785879170eb0737dbd954f"],
  ["JobBoard.confirm", "verifier", "0", "0x1b3f71b8fbe7dc4a727eb1b7252df25f1634f9f5222dfbd158329ffdb29e7db6"],
  ["IntentLog.commit", "agent", "0", "0x05af20e0f2f4711eae00045a094406ca7b7786ece331077ffcf46e8918bac73c"],
  ["Bond.slashByProof", "lender", "0", "0x68606a4cb994906a253f0acc63aac5c78442ecdc49c6a393ceb672784d61d748"],
  ["Lease.pay", "pilot", "60000000000", "0x5440d994b3c254e6e8925e7253da7537d90e63c6c4fe3612f6557a4b2e3c3bd3"],
];
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
          <KeyModeNote />
        </Row>
        <Row title={E.fullJobTitle}>
          <p className="mb-3 text-xs text-muted">{E.fullJobNote}</p>
          <ol className="flex flex-col divide-y divide-line">
            {FULL_JOB.map(([call, from, wei, tx], i) => <li key={tx} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2"><span className="mono w-5 shrink-0 text-muted">{i + 1}</span><span className="mono min-w-0 flex-1 text-ink-2">{call}</span><span className="text-xs text-muted">{from}{wei !== "0" ? `, ${wei} wei` : ""}</span><a className="mono text-xs underline decoration-gold hover:text-red-deep" href={`https://sepolia.basescan.org/tx/${tx}`} target="_blank" rel="noreferrer">{tx.slice(0, 10)}</a></li>)}
          </ol>
          <p className="mt-2 text-xs text-muted">{E.fullJobFisco}</p>
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

// The server's actor key mode and the public actor addresses, from /api/keys. Never a key.
function KeyModeNote() {
  const { d } = useLang();
  const [info, setInfo] = useState<{ mode: string; addresses: Record<string, string> } | null>(null);
  useEffect(() => { fetch("/api/keys").then((r) => r.json()).then(setInfo).catch(() => setInfo(null)); }, []);
  const K = d.keyMode;
  return (
    <div className="mt-2 text-xs text-muted">
      <p>{info?.mode === "deterministic-demo" ? K.deterministic : K.random}</p>
      {info ? <p className="mono mt-1 break-all text-[10px]">{K.addresses}: {Object.entries(info.addresses).map(([k, a]) => `${k} ${a}`).join(", ")}</p> : null}
    </div>
  );
}
