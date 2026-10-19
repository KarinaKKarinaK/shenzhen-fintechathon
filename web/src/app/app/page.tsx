import Link from "next/link";
import { ATTACKS, runAll } from "@/engine/attacks";
import { DEFAULT_POLICY } from "@/engine/policy";

export const dynamic = "force-dynamic";

export default function Page() {
  const results = runAll();
  const blocked = results.filter((r) => r.blocked).length;
  const byLayer = ["message", "policy", "contract"].map((l) => ({ l, n: results.filter((r) => r.layer === l).length, b: results.filter((r) => r.layer === l && r.blocked).length }));
  const tiles = [
    { href: "/app/neighbourhood", title: "Neighbourhood", body: "Humanoid, neighbour, geofence, split, slash by proof." },
    { href: "/app/fleet", title: "Fleet", body: "Drone, lender, declined job, faked log, title transfer." },
    { href: "/app/attack", title: "Attack lab", body: `${ATTACKS.length} attacks, then yours.` },
    { href: "/app/evidence", title: "Evidence", body: "Verify every claim." },
  ];
  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="text-sm text-muted">JiXin 机信</div><h1 className="display text-4xl md:text-5xl">Mission control</h1></div></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="tile"><div className="text-xs text-muted">Attacks blocked now</div><div className="kpi mt-1">{blocked} / {results.length}</div></div>
        <div className="tile"><div className="text-xs text-muted">Per transaction cap</div><div className="kpi mt-1">{DEFAULT_POLICY.perTxCap}</div></div>
        <div className="tile"><div className="text-xs text-muted">Daily cap</div><div className="kpi mt-1">{DEFAULT_POLICY.dailyCap}</div></div>
        <div className="tile"><div className="text-xs text-muted">Instalment band</div><div className="kpi mt-1">{DEFAULT_POLICY.rateBand[0] * 100} to {DEFAULT_POLICY.rateBand[1] * 100}%</div></div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="grad card p-5">
          <h2 className="text-lg font-bold">The bond rail</h2>
          <p className="mt-1 text-sm text-ink-2">Lock, earn, work, slash by proof, own. Four contracts' worth of rules in one loop.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">{tiles.map((t) => (<Link key={t.href} href={t.href} className="rounded-2xl bg-white/85 p-3 backdrop-blur transition hover:bg-white"><div className="font-semibold">{t.title}</div><div className="text-xs text-ink-2">{t.body}</div></Link>))}</div>
        </section>
        <section className="card p-5">
          <h2 className="text-lg font-bold">Defense by layer</h2>
          <ul className="mt-3 flex flex-col gap-2">{byLayer.map((x) => (<li key={x.l} className="grid grid-cols-[110px_1fr_60px] items-center gap-3 text-sm"><span className="capitalize text-ink-2">{x.l}</span><span className="h-3 overflow-hidden rounded-full bg-cream"><i className="block h-full bg-turq" style={{ width: `${(x.b / Math.max(x.n, 1)) * 100}%` }} /></span><span className="tabular-nums text-right text-muted">{x.b} / {x.n}</span></li>))}</ul>
          <h3 className="mt-5 text-sm font-semibold">Allowlisted payees</h3>
          <ul className="mono mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">{Object.entries(DEFAULT_POLICY.allowlist).map(([k, v]) => <li key={k} className="flex justify-between rounded-lg bg-cream px-2 py-1"><span className="text-ink">{k}</span><span className="text-muted">{v.slice(0, 10)}...{v.slice(-4)}</span></li>)}</ul>
        </section>
      </div>
    </div>
  );
}
