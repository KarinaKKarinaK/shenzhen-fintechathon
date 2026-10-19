"use client";
import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/i18n/LangProvider";

// Drift and replay monitors. Two CUSUM sparklines from /api/metrics, polled every five seconds,
// and the event log's recent runs with a Verify button that recomputes a run's hash chain.
type Cusum = { s?: number; alarm?: boolean; observations?: number; alarms?: number; history?: number[] };
type Drift = { classifier?: Cusum; denyRate?: Cusum; evalDelay?: number | null; params?: { classifier?: { h?: number }; denyRate?: { h?: number } } };
type RunRow = { runId: string; head: string; length: number };
type Verdict = { ok?: boolean; brokenAt?: number; length?: number };

const GOLD = "#b8860b", BAD = "#c8102e", GRID = "#efe9d8", MUTED = "#7a7a76";
const POLL_MS = 5000;

function Card({ title, sub, pill, bad, children }: { title: string; sub?: string; pill?: string; bad?: boolean; children: React.ReactNode }) {
  return (
    <div className="tile">
      <div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold">{title}</span>{pill ? <span className="pill" style={bad ? { background: BAD, color: "white" } : undefined}>{pill}</span> : null}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-muted">{sub}</div> : null}
      {children}
    </div>
  );
}

// The running sum over the last observations, the alarm line h dashed. Red once the sum has crossed it.
function Sparkline({ history, h, alarm, label }: { history: number[]; h: number; alarm: boolean; label: string }) {
  const W = 320, H = 64, pad = 4;
  const top = Math.max(h * 1.2, ...history, 0.01);
  const x = (i: number) => pad + (i / Math.max(history.length - 1, 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - (v / top) * (H - pad * 2);
  const d = history.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const col = alarm ? BAD : GOLD;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={label}>
      <line x1={pad} x2={W - pad} y1={y(h)} y2={y(h)} stroke={BAD} strokeDasharray="4 3" opacity={0.7} />
      <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke={GRID} />
      {history.length ? <path d={`${d} L${x(history.length - 1).toFixed(1)},${H - pad} L${pad},${H - pad} Z`} fill={col} opacity={0.12} /> : null}
      {history.length ? <path d={d} fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" /> : <text x={W / 2} y={H / 2} fontSize="10" fill={MUTED} textAnchor="middle">0</text>}
    </svg>
  );
}

function DriftCard({ title, sub, c, h }: { title: string; sub: string; c?: Cusum; h: number }) {
  const { d, t } = useLang();
  const M = d.monitors;
  const alarm = !!c?.alarm;
  return (
    <Card title={title} sub={sub} pill={c ? (alarm ? M.alarm : M.quiet) : undefined} bad={alarm}>
      <Sparkline history={c?.history ?? []} h={h} alarm={alarm} label={t("monitors.sparkAria", { name: title })} />
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{t("monitors.observations", { n: c?.observations ?? 0 })}</span>
        <span className="tabular-nums">s {c?.s ?? 0} / h {h}{c?.alarms ? `, ${t("monitors.alarms", { n: c.alarms })}` : ""}</span>
      </div>
    </Card>
  );
}

function ReplayCard() {
  const { d, t } = useLang();
  const M = d.monitors;
  const [runs, setRuns] = useState<RunRow[] | null | undefined>(undefined);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict | "busy">>({});
  const load = useCallback(() => {
    fetch("/api/replay").then(async (r) => { if (!r.ok) throw new Error(String(r.status)); return (await r.json()) as { runs?: RunRow[] }; })
      .then((j) => setRuns(j.runs ?? [])).catch(() => setRuns(null));
  }, []);
  useEffect(() => { load(); const id = setInterval(load, POLL_MS); return () => clearInterval(id); }, [load]);
  const check = async (runId: string) => {
    setVerdicts((v) => ({ ...v, [runId]: "busy" }));
    try {
      const r = await fetch(`/api/replay?run=${encodeURIComponent(runId)}`);
      const j = (await r.json()) as Verdict;
      setVerdicts((v) => ({ ...v, [runId]: { ok: !!j.ok, brokenAt: j.brokenAt, length: j.length } }));
    } catch { setVerdicts((v) => ({ ...v, [runId]: { ok: false } })); }
  };
  const rows = (runs ?? []).slice(0, 6);
  return (
    <Card title={M.replay} sub={M.replaySub} pill={runs?.length ? t("monitors.runs", { n: runs.length }) : undefined}>
      {runs === undefined ? <div className="mt-3 text-xs text-muted">{M.loading}</div> : runs === null ? <div className="mt-3 text-xs text-muted">{M.missing}</div> : !rows.length ? <div className="mt-3 text-xs text-muted">{M.noRuns}</div> : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {rows.map((r) => {
            const v = verdicts[r.runId];
            return (
              <li key={r.runId} className="grid grid-cols-[1fr_auto] items-center gap-2 text-xs">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{r.runId}</span>
                  <span className="tech block truncate text-[11px] text-muted">{r.head.slice(0, 18)}... {t("monitors.events", { n: r.length })}</span>
                </span>
                <span className="flex items-center gap-2">
                  {v && v !== "busy" ? <span className="pill" style={v.ok ? undefined : { background: BAD, color: "white" }}>{v.ok ? M.ok : t("monitors.broken", { i: v.brokenAt ?? "?" })}</span> : null}
                  <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-[11px]" onClick={() => check(r.runId)} disabled={v === "busy"}>{v === "busy" ? M.verifying : M.verify}</button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-2 text-[11px] text-muted">{M.replayNote}</div>
    </Card>
  );
}

export function Monitors() {
  const { d, t } = useLang();
  const M = d.monitors;
  const [drift, setDrift] = useState<Drift | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    const poll = () => fetch("/api/metrics").then(async (r) => { if (!r.ok) throw new Error(String(r.status)); return (await r.json()) as { drift?: Drift }; })
      .then((j) => { if (live) setDrift(j.drift ?? null); }).catch(() => { if (live) setDrift(null); });
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { live = false; clearInterval(id); };
  }, []);
  const hc = drift?.params?.classifier?.h ?? 2, hd = drift?.params?.denyRate?.h ?? 3;
  const evalLine = typeof drift?.evalDelay === "number" ? t("monitors.evalDelay", { n: drift.evalDelay }) : drift === undefined ? M.loading : M.missing;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <DriftCard title={M.classifier} sub={evalLine} c={drift?.classifier} h={hc} />
      <DriftCard title={M.denyRate} sub={M.denyRateSub} c={drift?.denyRate} h={hd} />
      <ReplayCard />
    </div>
  );
}
