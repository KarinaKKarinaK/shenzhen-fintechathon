import { runAll } from "@/engine/attacks";
import { JudgeConsole } from "@/components/JudgeConsole";
import { AttackGrid } from "@/components/AttackGrid";

export const dynamic = "force-dynamic";

export default function Page() {
  const results = runAll();
  const blocked = results.filter((r) => r.blocked).length;
  const chainMode = process.env.SURETY_PRIVATE_KEY ? "Base Sepolia, real transactions" : "Simulated, every hash labelled. A funded key switches to Base Sepolia.";
  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="display text-4xl md:text-5xl">Evidence</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-2">Verify without trusting us. Everything here runs at request time.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-4"><div className="text-xs text-muted">Attack set</div><div className="kpi">{blocked} of {results.length}</div><div className="text-sm text-muted">blocked at request time</div></div>
        <div className="card p-4"><div className="text-xs text-muted">Chain mode</div><div className="mt-1 text-sm">{chainMode}</div></div>
        <div className="card p-4"><div className="text-xs text-muted">Model mode</div><div className="mt-1 text-sm">{process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY ? "Model writes the explanations. Decisions stay in code." : "Scripted explanations. Decisions in code. An API key lets the model write the text."}</div></div>
      </div>

      <section className="aurora aurora-cream card mt-4 p-5"><JudgeConsole /></section>

      <section className="card mt-4 p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Attack set</h2><span className="text-xs text-muted">click a tile for the reason</span></div>
        <AttackGrid results={results} />
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
