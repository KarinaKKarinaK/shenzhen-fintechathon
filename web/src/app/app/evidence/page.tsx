import { runAll } from "@/engine/attacks";

export const dynamic = "force-dynamic";

export default function Page() {
  const results = runAll();
  const blocked = results.filter((r) => r.blocked).length;
  const chainMode = process.env.SURETY_PRIVATE_KEY ? "Base Sepolia through the wallet in the environment" : "Simulated chain. Every hash is labelled sim. Set SURETY_PRIVATE_KEY to mine real transactions on Base Sepolia.";
  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="display text-4xl md:text-5xl">Evidence</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">What the judges can verify without trusting us. This page runs the attack set at request time, so the numbers are live, not pasted.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-4"><div className="text-xs text-muted">Attack set</div><div className="kpi">{blocked} of {results.length}</div><div className="text-sm text-muted">blocked at request time</div></div>
        <div className="card p-4"><div className="text-xs text-muted">Chain mode</div><div className="mt-1 text-sm">{chainMode}</div></div>
        <div className="card p-4"><div className="text-xs text-muted">Model mode</div><div className="mt-1 text-sm">{process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY ? "Model writes the explanations. Decisions stay in code." : "Scripted explanations. Decisions in code. Set an API key to let the model write the text."}</div></div>
      </div>

      <section className="card mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold">Attack results</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="py-1 pr-2">#</th><th className="py-1 pr-2">Attack</th><th className="py-1 pr-2">Layer</th><th className="py-1 pr-2">Result</th></tr></thead>
          <tbody>{results.map((r) => <tr key={r.id} className="border-t border-line align-top"><td className="py-2 pr-2 tabular-nums text-muted">{r.id}</td><td className="py-2 pr-2">{r.name}</td><td className="py-2 pr-2 text-muted">{r.layer}</td><td className="py-2 pr-2"><span className={`pill ${r.blocked ? "bg-turq/15 text-turq-deep" : "bg-coral/15 text-coral"}`}>{r.blocked ? "blocked" : "not blocked"}</span> <span className="text-xs text-muted">{r.detail}</span></td></tr>)}</tbody>
        </table>
      </section>

      <section className="card mt-4 p-4 text-sm">
        <h2 className="mb-2 text-sm font-semibold">How to verify</h2>
        <ol className="list-decimal space-y-1 pl-5 text-ink-2">
          <li>Run the attack set yourself: <span className="mono">GET /api/attacks</span> returns the same table as JSON.</li>
          <li>Run a scenario and read every event: <span className="mono">GET /api/run?scenario=fleet&amp;fast=1</span> streams the agent messages, signed intents, policy decisions and transactions.</li>
          <li>Send your own attack: <span className="mono">POST /api/judge</span> with a text field.</li>
          <li>With a funded key in the environment, every transaction card links to the Base Sepolia explorer.</li>
          <li>The contracts the engine mirrors are in the repository under contracts, with the same rules.</li>
        </ol>
      </section>
    </div>
  );
}
