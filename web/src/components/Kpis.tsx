"use client";
import { CountUp } from "./CountUp";
import { yuan } from "./money";
import type { MachineView } from "./useRun";
import { useLang } from "@/i18n/LangProvider";

// The five money tiles above a run. Shared by the demo run and the live page.
export function KpiTiles({ m }: { m?: MachineView }) {
  const { d, t } = useLang();
  const R = d.run;
  const kpis: Array<{ label: string; value: React.ReactNode; sub?: string }> = [
    { label: R.balance, value: <>¥<CountUp value={m?.balance ?? 0} decimals={0} /></>, sub: R.balanceSub },
    { label: R.pilotBond, value: <>¥<CountUp value={m?.bond ?? 0} decimals={0} /></>, sub: m?.bondMin ? t("run.pilotBondSubMin", { min: yuan(m.bondMin) }) : R.pilotBondSub },
    { label: R.vendorBond, value: m?.vendorBond === undefined ? <span className="text-base text-muted">{R.na}</span> : <>¥<CountUp value={m.vendorBond} decimals={0} /></>, sub: R.vendorBondSub },
    { label: R.leaseLeft, value: <>¥<CountUp value={m?.leaseBalance ?? 0} decimals={0} /></>, sub: m ? (m.owned ? R.leaseOwned : t("run.leaseOf", { total: yuan(m.leaseTotal), mu: m.muTotal ? t("run.leaseMu", { done: m.muDone ?? 0, total: m.muTotal }) : "" })) : undefined },
    { label: R.tasksPaid, value: String(m?.tasksDone ?? 0), sub: R.tasksSub },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {kpis.map((k) => (<div key={k.label} className="tile"><div className="text-xs text-muted">{k.label}</div><div className="kpi mt-1 tabular-nums">{k.value}</div>{k.sub ? <div className="mt-0.5 text-[10px] text-muted">{k.sub}</div> : null}</div>))}
    </div>
  );
}
