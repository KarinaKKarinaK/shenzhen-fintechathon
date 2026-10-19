import { runAll } from "@/engine/attacks";
import { JudgeConsole } from "@/components/JudgeConsole";
import { AttackGrid } from "@/components/AttackGrid";
import { Status } from "@/components/StatusIcon";

export const dynamic = "force-dynamic";

export default function Page() {
  const results = runAll();
  const blocked = results.filter((r) => r.blocked).length;
  const chainMode = process.env.SURETY_PRIVATE_KEY ? "Base Sepolia, real transactions" : "Simulated, every hash labelled. A funded key switches to Base Sepolia.";
  return (
    <div className="page" style={{ maxWidth: 1180 }}>
      <header className="pb-6">
        <h1 className="display text-[39px]">Evidence</h1>
        <p className="measure mt-2 text-lg text-ink-2">Verify without trusting us. Everything here runs at request time.</p>
      </header>

      <dl className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.2fr_1.2fr]">
        <div className="tile tile-seal">
          <dt className="label">Attack set</dt>
          <dd className="kpi kpi-lg mt-1">{blocked} of {results.length}</dd>
          <dd className="mt-1"><Status kind={blocked === results.length ? "ok" : "warn"}>blocked at request time</Status></dd>
        </div>
        <div className="tile"><dt className="label">Chain mode</dt><dd className="mt-2">{chainMode}</dd></div>
        <div className="tile"><dt className="label">Model mode</dt><dd className="mt-2">{process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY ? "Model writes the explanations. Decisions stay in code." : "Scripted explanations. Decisions in code. An API key lets the model write the text."}</dd></div>
      </dl>

      <section className="py-8">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-[25px]">Attack set</h2><span className="label">Select a row for the reason</span></div>
        <AttackGrid results={results} />
      </section>

      <section className="band p-6 md:p-8"><JudgeConsole /></section>

      <section className="py-8">
        <h2 className="text-[25px]">How to verify</h2>
        <table className="ledger mt-3">
          <thead><tr><th>Request</th><th>Returns</th></tr></thead>
          <tbody>
            <tr><td className="mono text-ink">GET /api/attacks</td><td className="text-ink-2">The attack set as JSON.</td></tr>
            <tr><td className="mono text-ink">GET /api/run?scenario=fleet&amp;fast=1</td><td className="text-ink-2">Every event of a run, streamed.</td></tr>
            <tr><td className="mono text-ink">POST /api/judge</td><td className="text-ink-2">Your own attack, judged.</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
