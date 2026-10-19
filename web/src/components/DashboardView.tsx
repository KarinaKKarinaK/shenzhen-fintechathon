"use client";
import Link from "next/link";
import { Ticker } from "./Ticker";
import { useLang } from "@/i18n/LangProvider";

// Which attack cases exercise each policy field.
const EXERCISED: Record<string, string> = { allowlist: "2, 9, 12, 19", perTxCap: "7, 15", dailyCap: "8", rateBand: "5", maxPerHour: "6", deviationPct: "3, 5", geofences: "20", coverRequired: "20" };
const TIER_IDS = ["L0", "L1", "L2", "L3"] as const;

export function DashboardView({ attackN, blocked, total, byLayer, policy, allowlist }: { attackN: number; blocked: number; total: number; byLayer: { l: "message" | "policy" | "contract"; n: number; b: number }[]; policy: [string, string][]; allowlist: [string, string][] }) {
  const { d, t } = useLang();
  const D = d.dashboard;
  const tiles = [
    { href: "/app/fleet", title: D.liveTitle, body: D.liveBody },
    { href: "/app/evidence", title: D.evidenceTitle, body: t("dashboard.evidenceBody", { n: attackN }) },
  ];
  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="tech text-[11px] tracking-[0.25em] text-red">机信 JIXIN</div><h1 className="display text-4xl md:text-5xl">{D.title}</h1></div><span className="pill border border-line bg-white text-ink-2">{t("dashboard.blockedNow", { b: blocked, n: total })}</span></div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <div className="flex items-end justify-between"><h2 className="text-lg font-bold">{D.policyTitle}</h2><span className="text-xs text-muted">{D.policyNote}</span></div>
          <table className="passbook mt-3 w-full text-xs">
            <thead><tr><th className="text-left">{D.thField}</th><th className="text-left">{D.thValue}</th><th className="text-left">{D.thExercised}</th></tr></thead>
            <tbody>
              {policy.map(([k, v]) => (
                <tr key={k}><td>{k}</td><td className="text-ink">{v}</td><td className="mono text-muted">{EXERCISED[k] ? t("dashboard.exercisedBy", { ids: EXERCISED[k] }) : D.scenario}</td></tr>
              ))}
            </tbody>
          </table>
          <h3 className="mt-5 text-sm font-semibold">{D.allowlisted}</h3>
          <ul className="mono mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">{allowlist.map(([k, v]) => <li key={k} className="flex justify-between rounded-lg bg-paper-2 px-2 py-1"><span className="text-ink">{k}</span><span className="text-muted">{v.slice(0, 10)}...{v.slice(-4)}</span></li>)}</ul>
        </section>
        <section className="card p-5">
          <h2 className="text-lg font-bold">{D.tiersTitle}</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {TIER_IDS.map((id, i) => {
              const tier = D.tiers[id];
              return <li key={id} className="grid grid-cols-[44px_1fr] items-start gap-3 text-sm"><span className={`tech grid h-8 w-11 place-items-center text-[11px] font-bold ${i === TIER_IDS.length - 1 ? "bg-red text-white" : "bg-gold-soft text-ink"}`}>{id}</span><span><span className="font-semibold">{tier.name}</span><span className="text-muted">, {tier.who}</span><br /><span className="text-ink-2">{tier.rule}</span></span></li>;
            })}
          </ol>
          <h3 className="mt-5 text-sm font-semibold">{D.defense}</h3>
          <ul className="mt-2 flex flex-col gap-2">{byLayer.map((x) => (<li key={x.l} className="grid grid-cols-[90px_1fr_50px] items-center gap-3 text-sm"><span className="text-ink-2">{D.layers[x.l]}</span><span className="h-3 overflow-hidden rounded-full bg-paper-2"><i className="block h-full bg-red" style={{ width: `${(x.b / Math.max(x.n, 1)) * 100}%` }} /></span><span className="tabular-nums text-right text-muted">{x.b} / {x.n}</span></li>))}</ul>
        </section>
      </div>

      <div className="mt-4"><Ticker /></div>

      <ol className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {D.steps.map(([s, b], i) => (
          <li key={i} className="tile hover-lift"><div className="tech text-[10px] tracking-[0.2em] text-red">{String(i).padStart(2, "0")}</div><div className="mt-1 font-bold">{s}</div><div className="mt-1 text-xs text-ink-2">{b}</div></li>
        ))}
      </ol>

      <section className="aurora aurora-gold card mt-4 p-5 text-ink">
        <h2 className="text-lg font-bold">{D.contractsTitle}</h2>
        <p className="mt-1 text-sm text-ink/80">{D.contractsBody}</p>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">{tiles.map((x) => (<Link key={x.href} href={x.href} className="cut-sm bg-white/85 p-3 backdrop-blur transition hover:bg-white"><div className="font-semibold">{x.title}</div><div className="text-xs text-ink-2">{x.body}</div></Link>))}</div>
      </section>
    </div>
  );
}
