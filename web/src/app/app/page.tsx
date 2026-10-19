import Link from "next/link";
import { ATTACKS, runAll } from "@/engine/attacks";
import { DEFAULT_POLICY } from "@/engine/policy";
import { Ticker } from "@/components/Ticker";
import { Status } from "@/components/StatusIcon";

export const dynamic = "force-dynamic";

export default function Page() {
  const results = runAll();
  const blocked = results.filter((r) => r.blocked).length;
  const byLayer = ["message", "policy", "contract"].map((l) => ({ l, n: results.filter((r) => r.layer === l).length, b: results.filter((r) => r.layer === l && r.blocked).length }));
  const tiles = [
    { href: "/app/fleet", title: "Live demo", body: "Drone, lender, declined job, faked log, slash by proof, title transfer." },
    { href: "/app/evidence", title: "Evidence", body: `${ATTACKS.length} attack cases as proof, and a console to try your own.` },
  ];
  const kpis: Array<[string, React.ReactNode]> = [
    ["Attacks blocked now", `${blocked} / ${results.length}`],
    ["Per transaction cap", DEFAULT_POLICY.perTxCap],
    ["Daily cap", DEFAULT_POLICY.dailyCap],
    ["Instalment band", `${DEFAULT_POLICY.rateBand[0] * 100} to ${DEFAULT_POLICY.rateBand[1] * 100}%`],
  ];
  return (
    <div className="mx-auto max-w-[1280px]">
      <header className="py-6">
        <h1 className="display text-[39px]">Mission control</h1>
        {blocked === results.length ? <div className="mt-2"><Status kind="ok">All {results.length} attack cases blocked at request time</Status></div> : null}
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-y border-rule py-8 md:grid-cols-4">
        {kpis.map(([l, v]) => (<div key={l}><dt className="label">{l}</dt><dd className="kpi kpi-lg mt-1">{v}</dd></div>))}
      </dl>

      <div className="py-6"><Ticker /></div>

      <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule md:grid-cols-3 xl:grid-cols-6">
        {[["Lock", "Signed intent, fee locked"], ["Check", "Every rule, in code"], ["Work", "Proven by telemetry"], ["Confirm", "Fee released, split"], ["Repay", "Instalment to the lender"], ["Own", "Title moves on chain"]].map(([t, b], i) => (
          <li key={t} className="bg-surface p-4"><div className="label">Step {i + 1}</div><div className="mt-1 text-lg font-semibold">{t}</div><div className="mt-1 text-[15px] text-ink-2">{b}</div></li>
        ))}
      </ol>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="card p-6">
          <h2 className="text-[25px]">The bond rail</h2>
          <p className="mt-1 text-ink-2">Lock, earn, work, slash by proof, own. Four contracts&apos; worth of rules in one loop.</p>
          <div className="mt-5 flex flex-col gap-3">{tiles.map((t) => (
            <Link key={t.href} href={t.href} className="group flex items-start justify-between gap-4 rounded-md border border-rule p-4 transition-colors hover:border-ink-2">
              <span><span className="block font-semibold">{t.title}</span><span className="block text-[15px] text-ink-2">{t.body}</span></span>
              <span aria-hidden className="mt-1 text-ink-2 group-hover:text-ink">›</span>
            </Link>
          ))}</div>
        </section>
        <section className="card p-6">
          <h2 className="text-[25px]">Defense by layer</h2>
          <ul className="mt-5 flex flex-col gap-3">{byLayer.map((x) => (
            <li key={x.l} className="grid grid-cols-[90px_1fr_80px] items-center gap-3">
              <span className="capitalize text-ink-2">{x.l}</span>
              <span className="h-2 overflow-hidden rounded-full bg-paper" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}><i className="block h-full bg-ink" style={{ width: `${(x.b / Math.max(x.n, 1)) * 100}%` }} /></span>
              <span className="num text-right">{x.b} / {x.n}</span>
            </li>
          ))}</ul>
          <h3 className="mt-8 text-lg">Allowlisted payees</h3>
          <table className="ledger mt-2">
            <thead><tr><th>Payee</th><th>Address</th></tr></thead>
            <tbody>{Object.entries(DEFAULT_POLICY.allowlist).map(([k, v]) => <tr key={k}><td className="capitalize">{k}</td><td className="mono">{v.slice(0, 10)}…{v.slice(-4)}</td></tr>)}</tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
