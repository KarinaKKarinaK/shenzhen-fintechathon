"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import { yuan } from "./money";

// Shapes from GET /api/metrics and GET /api/ratchet. Every field is optional so the cards render
// a quiet placeholder until the engine ships the number.
export type GateMetrics = { trainN?: number; testN?: number; accuracy?: number; precision?: number; recall?: number; f1?: number; falseAlarmRate?: number; seed?: number };
export type PlausMetrics = {
  n?: number; tampered?: number; detectionRate?: number; falseAlarmRate?: number; threshold?: number; seed?: number;
  targetFalseAlarm?: number; achievedFalseAlarm?: number; calibrationN?: number; trackSmoothingGainPct?: number; rawFalseAlarmRate?: number; smoothedFalseAlarmRate?: number;
};
export type RatchetStep = { step?: number; proposal?: unknown; profit?: number | null; kept?: boolean };
export type RatchetRun = { steps?: RatchetStep[]; best?: unknown; baselineProfit?: number | null; bestProfit?: number | null };
export type ConformalMetrics = { threshold?: number; targetFalseAlarm?: number; achievedFalseAlarm?: number; coverage?: number; calibrationN?: number };
export type CreditMetrics = { path?: number[]; p?: number; tier?: string; credibility?: number; n?: number; parts?: { confirm?: number; instalment?: number; clean?: number }; rateBps?: number; bandBps?: [number, number]; prior?: { strength?: number }; federated?: { source?: string; pd?: number | null; modelSha256?: string | null; fateVersion?: string | null; startRateBps?: number }; flatStartRateBps?: number };
export type StressMetrics = { seasons?: number; defaultProbability?: number; pilotBondBelowMinAfterReaching?: number; expectedVendorDrawdown?: number; lgdWithoutBonds?: { mean?: number; p95?: number }; lgdWithBonds?: { mean?: number; p95?: number }; bondCover?: number };
export type Metrics = {
  gate?: GateMetrics; plausibility?: PlausMetrics; conformal?: ConformalMetrics; credit?: CreditMetrics; economics?: { stress?: StressMetrics };
  ratchet?: { baselineProfit?: number | null; bestProfit?: number | null; steps?: number }; planner?: { method?: string }; chain?: string; model?: string;
};

const GOLD = "#b8860b", BAD = "#c8102e", GRID = "#efe9d8", INK = "#121212", MUTED = "#7a7a76";

const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const frac = (v?: number | null) => (fin(v) ? Math.max(0, Math.min(1, v <= 1 ? v : v / 100)) : 0);
export const pct = (v?: number | null) => (fin(v) ? `${(frac(v) * 100).toFixed(1)}%` : undefined);

// One request-time fetch of the metrics the engine computes from its fixed held out sets.
export function useMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  useEffect(() => {
    let live = true;
    fetch("/api/metrics").then(async (r) => { if (!r.ok) throw new Error(String(r.status)); return (await r.json()) as Metrics; })
      .then((j) => { if (live) { setMetrics(j); setState("ok"); } })
      .catch(() => { if (live) setState("missing"); });
    return () => { live = false; };
  }, []);
  return { metrics, state };
}

async function fetchRatchet(steps: number): Promise<RatchetRun | null> {
  try { const r = await fetch(`/api/ratchet?steps=${steps}`); if (!r.ok) return null; return (await r.json()) as RatchetRun; } catch { return null; }
}

function Bars({ rows }: { rows: [string, number | undefined, string?][] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {rows.map(([l, v, col]) => (
        <li key={l} className="grid grid-cols-[84px_1fr_48px] items-center gap-2 text-xs">
          <span className="text-ink-2">{l}</span>
          <span className="flex h-2 overflow-hidden rounded-full bg-paper-2"><i style={{ width: `${frac(v) * 100}%`, background: col ?? GOLD }} /></span>
          <span className="tabular-nums text-right text-muted">{pct(v) ?? "?"}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, sub, pill, children }: { title: string; sub?: string; pill?: string; children: React.ReactNode }) {
  return (
    <div className="tile">
      <div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold">{title}</span>{pill ? <span className="pill bg-gold-soft text-ink">{pill}</span> : null}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-muted">{sub}</div> : null}
      {children}
    </div>
  );
}

function Quiet({ text }: { text: string }) { return <div className="mt-3 text-xs text-muted">{text}</div>; }

// Profit per step. Every proposal is a dot, kept ones in gold on the running best line, the baseline dashed red.
function RatchetChart({ steps, baseline, best }: { steps: RatchetStep[]; baseline?: number | null; best?: number | null }) {
  const { d } = useLang();
  const L = d.learned;
  const pts = steps.map((s, i) => ({ i, p: fin(s.profit) ? s.profit : null, kept: !!s.kept }));
  const vals = pts.map((p) => p.p).filter(fin);
  if (fin(baseline)) vals.push(baseline);
  if (fin(best)) vals.push(best);
  const lo = Math.min(...vals), hi = Math.max(...vals), range = hi - lo || 1;
  const W = 320, H = 120, pad = 34;
  const x = (i: number) => pad + (i / Math.max(pts.length - 1, 1)) * (W - pad - 8);
  const y = (v: number) => H - 16 - ((v - lo) / range) * (H - 30);
  const start = fin(baseline) ? baseline : (pts.find((p) => p.kept)?.p ?? pts[0]?.p ?? 0);
  const running: number[] = [];
  for (const p of pts) running.push(p.kept && p.p !== null ? p.p : (running[running.length - 1] ?? start));
  const line = running.map((v, i) => (i ? `H${x(i).toFixed(1)} V${y(v).toFixed(1)}` : `M${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join(" ");
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted"><span>{L.profit}</span><span className="flex gap-3"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: GOLD }} />{L.kept}</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: MUTED }} />{L.tried}</span><span className="flex items-center gap-1"><i className="h-0.5 w-3" style={{ background: BAD }} />{L.baseline}</span></span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={L.ratchetAria}>
        {[0.5, 1].map((g) => <line key={g} x1={pad} x2={W - 8} y1={y(lo + range * g)} y2={y(lo + range * g)} stroke={GRID} />)}
        <line x1={pad} x2={W - 8} y1={H - 16} y2={H - 16} stroke="#cfc8b4" />
        {fin(baseline) ? <><line x1={pad} x2={W - 8} y1={y(baseline)} y2={y(baseline)} stroke={BAD} strokeDasharray="4 3" /><text x={pad - 3} y={y(baseline) + 3} fontSize="9" fill={BAD} textAnchor="end">{yuan(baseline)}</text></> : null}
        <path d={line} fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinejoin="round" />
        {pts.map((p) => p.p === null ? null : <circle key={p.i} cx={x(p.i)} cy={y(p.p)} r={p.kept ? 3 : 1.5} fill={p.kept ? GOLD : MUTED} opacity={p.kept ? 1 : 0.6}><title>{`#${p.i + 1}: ${yuan(p.p, 2)}${p.kept ? ` (${L.kept})` : ""}`}</title></circle>)}
        {fin(best) ? <text x={W - 8} y={y(best) - 5} fontSize="10" fill={INK} textAnchor="end" fontWeight="600">{yuan(best)}</text> : null}
        <text x={pad} y={H - 4} fontSize="9" fill={MUTED}>1</text><text x={W - 8} y={H - 4} fontSize="9" fill={MUTED} textAnchor="end">{pts.length}</text>
      </svg>
    </div>
  );
}

function RatchetCard({ summary }: { summary?: Metrics["ratchet"] }) {
  const { d, t } = useLang();
  const L = d.learned;
  const [run, setRun] = useState<RatchetRun | null | undefined>(undefined);
  const [busy, setBusy] = useState(true);
  useEffect(() => { let live = true; fetchRatchet(60).then((r) => { if (live) { setRun(r); setBusy(false); } }); return () => { live = false; }; }, []);
  const again = () => { setBusy(true); fetchRatchet(60).then((r) => { setRun(r); setBusy(false); }); };
  const steps = run?.steps?.filter((s) => s && typeof s === "object") ?? [];
  const baseline = run?.baselineProfit ?? summary?.baselineProfit;
  const best = run?.bestProfit ?? summary?.bestProfit;
  const kept = steps.filter((s) => s.kept).length;
  return (
    <Card title={L.ratchet} sub={t("learned.ratchetSub", { n: steps.length || summary?.steps || 60 })} pill={steps.length ? t("learned.stepsKept", { k: kept, n: steps.length }) : undefined}>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div><div className="text-muted">{L.baseline}</div><div className="tech text-lg font-bold">{fin(baseline) ? yuan(baseline) : "?"}</div></div>
        <div><div className="text-muted">{L.best}</div><div className="tech text-lg font-bold text-gold-deep">{fin(best) ? yuan(best) : "?"}</div></div>
      </div>
      {steps.length ? <RatchetChart steps={steps} baseline={baseline} best={best} /> : <Quiet text={busy ? L.loading : L.missing} />}
      <div className="mt-2 flex items-center justify-between"><span className="text-[11px] text-muted">{L.ratchetNote}</span><button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-[11px]" onClick={again} disabled={busy}>{busy ? L.running : L.runAgain}</button></div>
    </Card>
  );
}

// The credit score along the fixed sequence: a dot per outcome, the line in gold.
function CreditPath({ path, label }: { path: number[]; label: string }) {
  const W = 320, H = 56, pad = 6;
  const lo = Math.min(...path) - 0.02, hi = Math.max(...path) + 0.02, range = hi - lo || 1;
  const x = (i: number) => pad + (i / Math.max(path.length - 1, 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - lo) / range) * (H - pad * 2);
  const line = path.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={label}>
      <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke={GRID} />
      <path d={line} fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinejoin="round" />
      {path.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={3} fill={i === path.length - 1 ? BAD : GOLD}><title>{v.toFixed(3)}</title></circle>)}
    </svg>
  );
}

function FusionCard({ p, c, quiet }: { p?: PlausMetrics; c?: ConformalMetrics; quiet: string }) {
  const { d, t } = useLang();
  const L = d.learned;
  return (
    <Card title={L.fusion} sub={L.fusionSub} pill={fin(p?.trackSmoothingGainPct) ? t("learned.fusionPill", { pct: p?.trackSmoothingGainPct }) : undefined}>
      {p && c ? (
        <>
          <Bars rows={[[L.rawFa, p.rawFalseAlarmRate, BAD], [L.filteredFa, p.smoothedFalseAlarmRate, GOLD], [L.targetFa, c.targetFalseAlarm, MUTED], [L.achievedFa, c.achievedFalseAlarm, GOLD]]} />
          <div className="mt-2 text-[11px] text-muted">{t("learned.fusionNote", { z: c.threshold ?? "?", n: c.calibrationN ?? "?", target: pct(c.targetFalseAlarm) ?? "?", cov: pct(c.coverage) ?? "?" })}</div>
        </>
      ) : <Quiet text={quiet} />}
    </Card>
  );
}

function CreditCard({ c, quiet }: { c?: CreditMetrics; quiet: string }) {
  const { d, t } = useLang();
  const L = d.learned;
  const band = c?.bandBps ?? [0, 0];
  return (
    <Card title={L.credit} sub={L.creditSub} pill={c?.tier ? t("learned.creditTier", { tier: c.tier }) : undefined}>
      {c ? (
        <>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div><div className="text-muted">{L.creditP}</div><div className="tech text-lg font-bold text-gold-deep">{fin(c.p) ? c.p.toFixed(3) : "?"}</div></div>
            <div><div className="text-muted">{L.creditCred}</div><div className="tech text-lg font-bold">{pct(c.credibility) ?? "?"}</div></div>
            <div><div className="text-muted">{L.creditRate}</div><div className="tech text-lg font-bold">{fin(c.rateBps) ? `${c.rateBps}` : "?"}</div></div>
          </div>
          <div className="mt-0.5 text-[11px] text-muted">{t("learned.creditBps", { bps: c.rateBps ?? "?", lo: band[0], hi: band[1] })}</div>
          {c.path?.length ? <CreditPath path={c.path} label={L.creditSeq} /> : null}
          <div className="text-[11px] text-muted">{L.creditSeq}</div>
          <Bars rows={[[L.creditConfirm, c.parts?.confirm], [L.creditInstalment, c.parts?.instalment], [L.creditClean, c.parts?.clean]]} />
          <div className="mt-2 text-[11px] text-muted">{t("learned.creditNote", { k: c.prior?.strength ?? "?" })}</div>
          {c.federated?.source === "fate" && fin(c.federated.pd) ? <div className="mt-1 text-[11px] text-ink-2">{t("learned.creditFate", { v: c.federated.fateVersion ?? "?", pd: c.federated.pd.toFixed(3), bps: c.federated.startRateBps ?? "?", flat: c.flatStartRateBps ?? "?", sha: (c.federated.modelSha256 ?? "").slice(0, 12) })}</div> : null}
        </>
      ) : <Quiet text={quiet} />}
    </Card>
  );
}

function Money({ label, v, tone }: { label: string; v?: number; tone?: string }) {
  return <div><div className="text-[11px] text-muted">{label}</div><div className={`tech text-lg font-bold ${tone ?? ""}`}>{fin(v) ? yuan(v) : "?"}</div></div>;
}

function StressCard({ s, quiet }: { s?: StressMetrics; quiet: string }) {
  const { d, t } = useLang();
  const L = d.learned;
  return (
    <Card title={L.stress} sub={s ? t("learned.stressSub", { n: s.seasons ?? "?" }) : undefined} pill={fin(s?.defaultProbability) ? t("learned.stressDefault", { p: pct(s?.defaultProbability) }) : undefined}>
      {s ? (
        <>
          <div className="mt-2 flex flex-col gap-2">
            <Money label={L.stressVendor} v={s.expectedVendorDrawdown} />
            <Money label={L.stressLgdBare} v={s.lgdWithoutBonds?.p95} tone="text-red" />
            <Money label={L.stressLgdBonded} v={s.lgdWithBonds?.p95} tone="text-gold-deep" />
          </div>
          <div className="mt-2 text-[11px] text-muted">{t("learned.stressCover", { pct: pct(s.bondCover) ?? "?" })}. {t("learned.stressBelow", { p: pct(s.pilotBondBelowMinAfterReaching) ?? "?" })}.</div>
          <div className="mt-1 text-[11px] text-muted">{L.stressNote}</div>
        </>
      ) : <Quiet text={quiet} />}
    </Card>
  );
}

export function LearnedComponents() {
  const { d, t } = useLang();
  const L = d.learned;
  const { metrics, state } = useMetrics();
  const g = metrics?.gate, p = metrics?.plausibility;
  const quiet = state === "loading" ? L.loading : L.missing;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Card title={L.classifier} sub={L.classifierSub} pill={pct(g?.f1) ? `F1 ${pct(g?.f1)}` : undefined}>
        {g ? (
          <>
            <Bars rows={[[L.precision, g.precision], [L.recall, g.recall], [L.f1, g.f1], [L.falseAlarm, g.falseAlarmRate, BAD]]} />
            <div className="mt-2 text-[11px] text-muted">{t("learned.heldOut", { n: g.testN ?? "?", total: (g.trainN ?? 0) + (g.testN ?? 0) || "?", seed: g.seed ?? "?" })}{fin(g.accuracy) ? ` ${t("learned.accuracyLine", { v: pct(g.accuracy) })}` : ""}</div>
          </>
        ) : <Quiet text={quiet} />}
      </Card>
      <Card title={L.anomaly} sub={p ? t("learned.anomalySub", { n: p.n ?? "?", tampered: p.tampered ?? "?", seed: p.seed ?? "?" }) : L.anomalySubPlain} pill={fin(p?.threshold) ? t("learned.threshold", { z: p?.threshold }) : undefined}>
        {p ? (
          <>
            <Bars rows={[[L.detection, p.detectionRate], [L.falseAlarm, p.falseAlarmRate, BAD]]} />
            <div className="mt-2 text-[11px] text-muted">{L.anomalyNote}</div>
            {fin(p.targetFalseAlarm) && fin(p.achievedFalseAlarm) ? <div className="mt-1 text-[11px] text-muted">{t("learned.conformal", { target: pct(p.targetFalseAlarm), achieved: pct(p.achievedFalseAlarm), n: p.calibrationN ?? "?" })}</div> : null}
            {fin(p.trackSmoothingGainPct) ? <div className="mt-1 text-[11px] text-muted">{t("learned.smoothing", { raw: pct(p.rawFalseAlarmRate), smooth: pct(p.smoothedFalseAlarmRate), pct: p.trackSmoothingGainPct })}</div> : null}
          </>
        ) : <Quiet text={quiet} />}
      </Card>
      <RatchetCard summary={metrics?.ratchet} />
      <CreditCard c={metrics?.credit} quiet={quiet} />
      <FusionCard p={p} c={metrics?.conformal} quiet={quiet} />
      <StressCard s={metrics?.economics?.stress} quiet={quiet} />
    </div>
  );
}
