import Link from "next/link";
import { ATTACKS, runAll } from "@/engine/attacks";
import * as policyMod from "@/engine/policy";
import { Ticker } from "@/components/Ticker";

export const dynamic = "force-dynamic";

type Tier = { tier?: string | number; id?: string; who?: string; can?: string; name?: string; actor?: string; scope?: string; rule?: string };
const FALLBACK_TIERS: Tier[] = [
  { tier: "L0", who: "machine agent", can: "pay allowlisted payees within the caps, accept and start tasks" },
  { tier: "L1", who: "requester", can: "confirm work done, which releases the fee" },
  { tier: "L2", who: "lender agent", can: "freeze new jobs when the bond falls below the minimum" },
  { tier: "L3", who: "operator, hardware button", can: "change a cap, top up the bond" },
];

// Which attack cases exercise each policy field.
const EXERCISED: Record<string, string> = { allowlist: "2, 9, 12, 19", perTxCap: "7, 15", dailyCap: "8", rateBand: "5", maxPerHour: "6", deviationPct: "3, 5", geofences: "20", coverRequired: "20" };

function fmt(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (v && typeof v === "object") return Object.keys(v).join(", ");
  return String(v);
}

export default async function Page() {
  const { DEFAULT_POLICY } = policyMod;
  const tiers = ((policyMod as unknown as { TIERS?: Tier[] }).TIERS ?? FALLBACK_TIERS).slice(0, 6);
  const results = await Promise.resolve(runAll());
  const blocked = results.filter((r) => r.blocked).length;
  const byLayer = ["message", "policy", "contract"].map((l) => ({ l, n: results.filter((r) => r.layer === l).length, b: results.filter((r) => r.layer === l && r.blocked).length }));
  const tiles = [
    { href: "/app/fleet", title: "Fleet", body: "Drone on hire purchase. Decline, work, repay, own itself, then get caught." },
    { href: "/app/neighbour", title: "Neighbour", body: "Household humanoid. Bond earned in, solvency proved, slashed, button top up." },
    { href: "/app/evidence", title: "Evidence", body: `${ATTACKS.length} attack cases, naive against gated, and a console to try your own.` },
  ];
  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="tech text-[11px] tracking-[0.25em] text-red">机信 JIXIN</div><h1 className="display text-4xl md:text-5xl">Mission control</h1></div><span className="pill border border-line bg-white text-ink-2">{blocked} of {results.length} attacks blocked now</span></div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <div className="flex items-end justify-between"><h2 className="text-lg font-bold">Policy, as data</h2><span className="text-xs text-muted">the model never sees this table</span></div>
          <table className="passbook mt-3 w-full text-xs">
            <thead><tr><th className="text-left">Field</th><th className="text-left">Value</th><th className="text-left">Exercised by</th></tr></thead>
            <tbody>
              {Object.entries(DEFAULT_POLICY).map(([k, v]) => (
                <tr key={k}><td>{k}</td><td className="text-ink">{fmt(v)}</td><td className="mono text-muted">{EXERCISED[k] ? `attacks ${EXERCISED[k]}` : "scenario"}</td></tr>
              ))}
            </tbody>
          </table>
          <h3 className="mt-5 text-sm font-semibold">Allowlisted payees</h3>
          <ul className="mono mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">{Object.entries(DEFAULT_POLICY.allowlist).map(([k, v]) => <li key={k} className="flex justify-between rounded-lg bg-paper-2 px-2 py-1"><span className="text-ink">{k}</span><span className="text-muted">{v.slice(0, 10)}...{v.slice(-4)}</span></li>)}</ul>
        </section>
        <section className="card p-5">
          <h2 className="text-lg font-bold">Permission tiers</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {tiers.map((t, i) => {
              const label = typeof t.tier === "number" ? `L${t.tier}` : (t.tier ?? t.id ?? `L${i}`);
              return <li key={label} className="grid grid-cols-[44px_1fr] items-start gap-3 text-sm"><span className={`tech grid h-8 w-11 place-items-center text-[11px] font-bold ${i === tiers.length - 1 ? "bg-red text-white" : "bg-gold-soft text-ink"}`}>{label}</span><span><span className="font-semibold">{t.name ?? t.actor ?? t.who}</span>{t.name && t.who ? <span className="text-muted">, {t.who}</span> : null}<br /><span className="text-ink-2">{t.rule ?? t.can ?? t.scope}</span></span></li>;
            })}
          </ol>
          <h3 className="mt-5 text-sm font-semibold">Defense by layer</h3>
          <ul className="mt-2 flex flex-col gap-2">{byLayer.map((x) => (<li key={x.l} className="grid grid-cols-[90px_1fr_50px] items-center gap-3 text-sm"><span className="capitalize text-ink-2">{x.l}</span><span className="h-3 overflow-hidden rounded-full bg-paper-2"><i className="block h-full bg-red" style={{ width: `${(x.b / Math.max(x.n, 1)) * 100}%` }} /></span><span className="tabular-nums text-right text-muted">{x.b} / {x.n}</span></li>))}</ul>
        </section>
      </div>

      <div className="mt-4"><Ticker /></div>

      <ol className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {[["Plan", "Rank the day's jobs by margin"], ["Lock", "Signed intent, fee locked"], ["Check", "Every rule, in code"], ["Work", "Proven by telemetry"], ["Confirm", "Fee released, split"], ["Repay", "Instalment to the lender"], ["Own", "Title moves on chain"]].map(([t, b], i) => (
          <li key={t} className="tile hover-lift"><div className="tech text-[10px] tracking-[0.2em] text-red">{String(i).padStart(2, "0")}</div><div className="mt-1 font-bold">{t}</div><div className="mt-1 text-xs text-ink-2">{b}</div></li>
        ))}
      </ol>

      <section className="aurora aurora-gold card mt-4 p-5 text-ink">
        <h2 className="text-lg font-bold">Three contracts and one wallet standard</h2>
        <p className="mt-1 text-sm text-ink/80">Bond, JobBoard and Lease hold the rules. The wallet signs typed intents and nothing else.</p>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">{tiles.map((t) => (<Link key={t.href} href={t.href} className="cut-sm bg-white/85 p-3 backdrop-blur transition hover:bg-white"><div className="font-semibold">{t.title}</div><div className="text-xs text-ink-2">{t.body}</div></Link>))}</div>
      </section>
    </div>
  );
}
