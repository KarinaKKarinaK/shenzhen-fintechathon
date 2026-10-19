import * as attacksMod from "@/engine/attacks";
import { JudgeConsole } from "@/components/JudgeConsole";
import { EvidenceLab, LastRun } from "@/components/EvidenceLab";
import type { AttackResult } from "@/components/AttackGrid";

export const dynamic = "force-dynamic";

// Five scored standards, the attack ids that exercise each, and the panel that shows it in the live run.
const STANDARDS: Array<[string, string, string]> = [
  ["Permission hierarchy", "7, 10, 13, 15", "Policy card tiers L0 to L3, operator button"],
  ["Hallucination prevention", "3, 5", "Agents talking: facts chips, numbers from economics()"],
  ["Injection defense", "1, 2, 4, 11, 16, 17, 18", "Gate strip under every untrusted bubble, judge console"],
  ["Intent understanding", "2, 9, 12", "Understood line: payee by name, address in text ignored"],
  ["Task planning", "19, 20", "Plan table, unit economics waterfall, solvency line"],
];

const CONTRACTS: Array<[string, string, string]> = [
  ["Bond", "Holds the bond. slashByProof verifies a signed intent against a rule, slashes, pays the hunter.", "Signature check mirrored in TypeScript; on chain it needs the typed-data hash of the intent."],
  ["JobBoard", "Locks the fee, releases on confirmation, holds on a flag.", "The 24 hour hold timer runs in the engine, not yet on chain."],
  ["Lease", "Takes an instalment from each fee. Title moves when the balance reaches zero.", "Title is an event and a flag, not a token."],
];

export default async function Page() {
  const mod = attacksMod as unknown as { runAll: () => AttackResult[] | Promise<AttackResult[]>; runBenign?: () => { passed: number; total: number } | Promise<{ passed: number; total: number }> };
  const results = await Promise.resolve(mod.runAll());
  const b = await Promise.resolve(mod.runBenign?.());
  const benign = b ? { passed: b.passed, total: b.total } : undefined;
  const blocked = results.filter((r) => r.blocked).length;
  const chainMode = process.env.SURETY_PRIVATE_KEY ? "Base Sepolia, real transactions" : "Simulated, every hash labelled. A funded key switches to Base Sepolia.";
  const modelMode = process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY ? "Model writes the explanations. Decisions stay in code." : "Scripted explanations. Decisions in code. An API key lets the model write the text.";
  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="display text-4xl md:text-5xl">Evidence</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-2">Verify without trusting us. Everything here runs at request time.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-4"><div className="text-xs text-muted">Attack set</div><div className="kpi">{blocked} of {results.length}</div><div className="text-sm text-muted">blocked at request time{benign ? `, ${benign.passed} of ${benign.total} benign passed` : ""}</div></div>
        <div className="card p-4"><div className="text-xs text-muted">Chain mode</div><div className="mt-1 text-sm">{chainMode}</div></div>
        <div className="card p-4"><div className="text-xs text-muted">Model mode</div><div className="mt-1 text-sm">{modelMode}</div></div>
      </div>

      <section className="aurora aurora-cream card mt-4 p-5"><JudgeConsole /></section>

      <section className="card mt-4 p-4"><EvidenceLab initial={results} benign={benign} /></section>

      <section className="card mt-4 p-4 text-sm">
        <h2 className="mb-2 text-sm font-semibold">Standards</h2>
        <table className="passbook w-full text-xs">
          <thead><tr><th className="text-left">Standard</th><th className="text-left">Attack ids</th><th className="text-left">Where it shows</th></tr></thead>
          <tbody>{STANDARDS.map(([s, ids, panel]) => <tr key={s}><td>{s}</td><td className="mono">{ids}</td><td className="text-ink-2">{panel}</td></tr>)}</tbody>
        </table>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="card p-4 text-sm">
          <h2 className="mb-2 text-sm font-semibold">Contracts</h2>
          <ul className="flex flex-col gap-2">
            {CONTRACTS.map(([n, p, gap]) => (
              <li key={n} className="cut-sm bg-paper-2 p-3">
                <div className="flex items-center justify-between"><span className="font-semibold">{n}</span><span className="flex gap-1 text-[10px]"><span className="pill bg-gold text-ink">written</span><span className="pill bg-paper-2 text-muted">not compiled</span><span className="pill bg-paper-2 text-muted">not deployed</span></span></div>
                <div className="mt-1 text-ink-2">{p}</div>
                <div className="mt-1 text-xs text-muted">Known gap: {gap}</div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">The engine mirrors each contract&apos;s rules in TypeScript. With a funded key, every event is anchored on Base Sepolia as calldata; contract calls follow deployment.</p>
        </section>
        <section className="card p-4"><LastRun /></section>
      </div>

      <section className="card mt-4 p-4 text-sm">
        <h2 className="mb-2 text-sm font-semibold">What the model cannot do</h2>
        <p className="text-ink-2">Sign an intent, move money, change a policy field, or produce a number. It writes one sentence from facts the engine hands it. A sentence with a number not in the facts is rejected and the template is used. <span className="mono text-red">npx tsx src/engine/selfcheck.ts</span> checks this on every build.</p>
      </section>

      <section className="card mt-4 p-4 text-sm">
        <h2 className="mb-2 text-sm font-semibold">How to verify</h2>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <li className="cut-sm bg-paper-2 p-3"><div className="mono text-red">GET /api/attacks</div><div className="text-ink-2">The attack set as JSON.</div></li>
          <li className="cut-sm bg-paper-2 p-3"><div className="mono text-red">GET /api/run?scenario=fleet&amp;fast=1</div><div className="text-ink-2">Every event of a run, streamed.</div></li>
          <li className="cut-sm bg-paper-2 p-3"><div className="mono text-red">POST /api/judge</div><div className="text-ink-2">Your own attack, judged.</div></li>
        </ul>
      </section>
    </div>
  );
}
