"use client";
import type { ChainTx, PolicyDecision, EngineEvent } from "@/engine/types";
import type { Econ } from "./useRun";
import { yuan } from "./money";
import { useLang } from "@/i18n/LangProvider";
import { ruleLabel } from "@/engine/i18n";

// Small SVG charts. Thin marks, one hue per series, labels in ink, legend when two series.

const IN = "#b8860b", OUT = "#3366cc", BAD = "#c8102e", GRID = "#efe9d8", INK = "#121212", MUTED = "#7a7a76";
const inbound = new Set(["fee_in", "top_up", "bounty", "release"]);

export function CashFlow({ txs }: { txs: ChainTx[] }) {
  const { d } = useLang();
  const G = d.graphs;
  const items = [...txs].reverse().filter((t) => t.kind !== "title" && t.kind !== "lock").slice(-24);
  const max = Math.max(1, ...items.map((t) => t.amount));
  const W = 320, H = 120, pad = 36;
  const bw = Math.max(4, (W - pad * 2) / Math.max(items.length, 12) - 3);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted"><span>{G.cashTitle}</span><span className="flex gap-3"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: IN }} />{G.in}</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: OUT }} />{G.out}</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: BAD }} />{G.slash}</span></span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={G.cashAria}>
        {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={pad} x2={W - 4} y1={H - 18 - g * (H - 30)} y2={H - 18 - g * (H - 30)} stroke={GRID} strokeWidth="1" />)}
        <line x1={pad} x2={W - 4} y1={H - 18} y2={H - 18} stroke="#cfc8b4" />
        {items.map((t, i) => {
          const h = (t.amount / max) * (H - 30);
          const col = t.kind === "slash" || t.kind === "refund" ? BAD : inbound.has(t.kind) ? IN : OUT;
          return <g key={t.hash}><title>{`${t.label}: ${yuan(t.amount)}`}</title><rect x={pad + i * (bw + 3)} y={H - 18 - h} width={bw} height={h} rx="2" fill={col} /></g>;
        })}
        <text x={pad} y={H - 4} fontSize="9" fill={MUTED}>{G.first}</text><text x={W - 4} y={H - 4} fontSize="9" fill={MUTED} textAnchor="end">{G.latest}</text>
        <text x={pad - 4} y={14} fontSize="9" fill={MUTED} textAnchor="end">{yuan(max)}</text>
      </svg>
      {!items.length ? <div className="text-xs text-muted">{G.noTx}</div> : null}
    </div>
  );
}

// Bond over the run as steps: each bond fill lifts it, a slash drops it, the minimum is the dashed line.
export function BondHistory({ events }: { events: EngineEvent[] }) {
  const { d, t } = useLang();
  const G = d.graphs;
  const pts: Array<{ b: number; min: number; fill?: number; slash?: number }> = [];
  let min = 0;
  for (const e of events) {
    if (e.t === "machine") { min = e.state.bondMin; pts.push({ b: e.state.bond, min }); }
    if (e.t === "chain" && (e.tx.kind === "bond_fill" || e.tx.kind === "top_up")) { const last = pts[pts.length - 1]?.b ?? 0; pts.push({ b: last + e.tx.amount, min, fill: e.tx.amount }); }
    if (e.t === "chain" && e.tx.kind === "slash") { const last = pts[pts.length - 1]?.b ?? 0; pts.push({ b: Math.max(0, last - e.tx.amount), min, slash: e.tx.amount }); }
  }
  const W = 320, H = 110, pad = 26;
  const max = Math.max(1, ...pts.map((p) => Math.max(p.b, p.min * 1.3)));
  const x = (i: number) => pad + (i / Math.max(pts.length - 1, 1)) * (W - pad - 6);
  const y = (v: number) => H - 16 - (v / max) * (H - 28);
  const path = pts.map((p, i) => (i ? `H${x(i).toFixed(1)} V${y(p.b).toFixed(1)}` : `M${x(i).toFixed(1)},${y(p.b).toFixed(1)}`)).join(" ");
  const last = pts[pts.length - 1];
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted"><span>{G.bondTitle}</span><span className="flex gap-3"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: IN }} />{G.fill}</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: BAD }} />{G.slash}</span></span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={G.bondAria}>
        {[0.5, 1].map((g) => <line key={g} x1={pad} x2={W - 6} y1={y(max * g)} y2={y(max * g)} stroke={GRID} />)}
        {pts.length ? <line x1={pad} x2={W - 6} y1={y(min)} y2={y(min)} stroke={BAD} strokeDasharray="4 3" /> : null}
        {pts.length ? <text x={W - 6} y={y(min) - 3} fontSize="9" fill={BAD} textAnchor="end">{t("graphs.minimum", { v: yuan(min) })}</text> : null}
        <path d={path} fill="none" stroke={IN} strokeWidth="2" strokeLinejoin="round" />
        {pts.map((p, i) => p.fill ? <g key={`f${i}`}><title>{t("graphs.bondFill", { v: p.fill })}</title><circle cx={x(i)} cy={y(p.b)} r="3" fill={IN} /></g> : p.slash ? <g key={`s${i}`}><title>{t("graphs.slashOf", { v: p.slash })}</title><circle cx={x(i)} cy={y(p.b)} r="3.5" fill={BAD} /></g> : null)}
        {last ? <text x={x(pts.length - 1) - 8} y={y(last.b) - 8} fontSize="10" fill={INK} textAnchor="end" fontWeight="600">{yuan(last.b)}</text> : null}
      </svg>
      {!pts.length ? <div className="text-xs text-muted">{G.noState}</div> : null}
    </div>
  );
}

// Only the rules that ever failed get a bar. The rest are one line: they passed every time.
export function RuleHits({ decisions }: { decisions: PolicyDecision[] }) {
  const { d, t, lang } = useLang();
  const G = d.graphs;
  const map = new Map<string, { ok: number; bad: number }>();
  decisions.forEach((dec) => dec.lines.forEach((l) => { const r = map.get(l.rule) ?? { ok: 0, bad: 0 }; if (l.ok) r.ok += 1; else r.bad += 1; map.set(l.rule, r); }));
  const rows = [...map.entries()].sort((a, b) => b[1].ok + b[1].bad - (a[1].ok + a[1].bad));
  const failing = rows.filter(([, r]) => r.bad > 0).sort((a, b) => b[1].bad - a[1].bad);
  const clean = rows.filter(([, r]) => r.bad === 0);
  const total = rows.reduce((a, [, r]) => a + r.ok + r.bad, 0);
  const max = Math.max(1, ...failing.map(([, r]) => r.ok + r.bad));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted"><span>{G.rulesTitle}</span><span>{t("graphs.checksTotal", { n: total })}</span></div>
      {failing.length ? (
        <ul className="flex flex-col gap-1.5">
          {failing.map(([rule, r]) => (
            <li key={rule} className="grid grid-cols-[120px_1fr_auto] items-center gap-2 text-xs">
              <span className="truncate text-ink-2">{ruleLabel(lang, rule)}</span>
              <span className="flex h-2.5 overflow-hidden rounded-full bg-paper-2"><i style={{ width: `${(r.ok / max) * 100}%`, background: IN }} /><i style={{ width: `${(r.bad / max) * 100}%`, background: BAD, marginLeft: 2 }} /></span>
              <span className="tabular-nums text-right text-red">{t("graphs.failedOf", { f: r.bad, n: r.ok + r.bad })}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {clean.length ? <div className="mt-2 text-xs text-muted" title={clean.map(([rule]) => ruleLabel(lang, rule)).join(", ")}>{t(failing.length ? "graphs.cleanRules" : "graphs.allClean", { n: clean.length })}</div> : null}
      {!rows.length ? <div className="text-xs text-muted">{G.noChecks}</div> : null}
    </div>
  );
}

// Waterfall: the fee steps down through instalment, energy and rail to the margin.
// The reserve rule is the dashed line. Margin goes red when it lands below it.
export function UnitEconomics({ eco, title }: { eco?: Econ; title?: string }) {
  const { d, t } = useLang();
  const G = d.graphs;
  if (!eco) return <div><div className="mb-2 text-xs text-muted">{G.ecoTitle}</div><div className="text-xs text-muted">{G.noJob}</div></div>;
  const fee = eco.fee ?? 0;
  const steps = [["instalment", eco.instalment ?? 0], ["energy", eco.energy ?? 0], ["rail", eco.rail ?? 0]] as const;
  const margin = eco.margin ?? fee - steps.reduce((a, [, v]) => a + v, 0);
  const rule = eco.reserveRule ?? 0;
  const clears = eco.clears ?? margin >= rule;
  const W = 320, H = 120, pad = 26, base = H - 18;
  const max = Math.max(fee, rule, 1);
  const y = (v: number) => base - (v / max) * (H - 32);
  const cols = steps.length + 2;
  const bw = (W - pad - 8) / cols - 6;
  const bars: Array<{ id: string; top: number; bottom: number; col: string }> = [{ id: "fee", top: fee, bottom: 0, col: IN }];
  let level = fee;
  for (const [l, v] of steps) { bars.push({ id: l, top: level, bottom: level - v, col: OUT }); level -= v; }
  bars.push({ id: "margin", top: Math.max(margin, 0), bottom: 0, col: clears ? IN : BAD });
  const label = (id: string) => (G.bars as Record<string, string>)[id] ?? id;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted"><span>{t("graphs.ecoTitled", { title: title ? `, ${title}` : "" })}</span><span className={clears ? "text-gold-deep" : "text-red"}>{t("graphs.margin", { m: yuan(margin, 2), state: clears ? G.clears : G.below, r: yuan(rule) })}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={G.ecoAria}>
        <line x1={pad} x2={W - 4} y1={base} y2={base} stroke="#cfc8b4" />
        <line x1={pad} x2={W - 4} y1={y(rule)} y2={y(rule)} stroke={BAD} strokeDasharray="4 3" />
        <text x={W - 4} y={y(rule) - 3} fontSize="9" fill={BAD} textAnchor="end">{t("graphs.reserveRule", { r: rule })}</text>
        {bars.map((b, i) => {
          const x = pad + i * (bw + 6);
          const top = y(Math.max(b.top, b.bottom)), h = Math.max(1, Math.abs(y(b.bottom) - y(b.top)));
          return <g key={b.id}><title>{`${label(b.id)}: ${(b.top - b.bottom).toFixed(2)}`}</title><rect x={x} y={top} width={bw} height={h} rx="2" fill={b.col} opacity={i === 0 || i === bars.length - 1 ? 1 : 0.8} />{i > 0 && i < bars.length - 1 ? <line x1={x - 6} x2={x} y1={y(b.top)} y2={y(b.top)} stroke={MUTED} strokeWidth="1" /> : null}<text x={x + bw / 2} y={H - 5} fontSize="8.5" fill={MUTED} textAnchor="middle">{label(b.id)}</text><text x={x + bw / 2} y={top - 3} fontSize="8.5" fill={INK} textAnchor="middle">{(b.top - b.bottom).toFixed(i === 0 ? 0 : 1)}</text></g>;
        })}
      </svg>
    </div>
  );
}

const typeTone: Record<string, string> = { chain: "bg-gold-soft text-red-deep", policy: "bg-paper-2 text-slate", intent: "bg-gold-soft text-ink", "agent.message": "bg-paper-2 text-ink-2", machine: "bg-paper-2 text-ink-2", job: "bg-gold-soft text-ink", attack: "bg-red-soft text-red", narration: "bg-paper-2 text-muted", button: "bg-red text-white", done: "bg-ink text-white", gate: "bg-ink text-gold", proof: "bg-red text-white", plan: "bg-gold text-ink", economics: "bg-gold-soft text-ink", solvency: "bg-gold-soft text-ink", telemetry: "bg-paper-2 text-slate", understood: "bg-paper-2 text-ink" };

// The raw event line. Event types, ids and field names are code and stay English.
function lineFor(e: EngineEvent): string {
  switch (e.t) {
    case "chain": return `${e.tx.kind} ${e.tx.amount} ${e.tx.hash.slice(0, 10)} blk ${e.tx.block}${e.tx.simulated ? " sim" : ""}`;
    case "policy": return `${e.decision.intentId} ${e.decision.verdict} ${e.decision.lines.filter(l => !l.ok).map(l => l.rule).join(",") || "all rules pass"}`;
    case "intent": return `${e.intent.id} ${e.intent.kind} ${e.intent.actor} ${e.intent.amount ?? ""} ${e.intent.signature.slice(0, 12)}`;
    case "agent.message": return `${e.from}>${e.to} ${e.untrusted ? "[untrusted] " : ""}${e.text.slice(0, 70)}`;
    case "machine": return `${e.state.id} ${e.state.status} bal ${e.state.balance.toFixed(1)} bond ${e.state.bond.toFixed(0)} lease ${e.state.leaseBalance.toFixed(1)} pos ${e.state.position.x.toFixed(1)},${e.state.position.z.toFixed(1)}`;
    case "job": return `${e.job.id} ${e.job.status} fee ${e.job.fee}`;
    case "attack": return `${e.blocked ? "BLOCKED" : "PASSED"} ${e.where} ${e.name.slice(0, 50)}`;
    case "button": return `${e.waiting ? "WAIT" : "PRESSED"} ${e.what}`;
    case "done": return e.summary.slice(0, 90);
    case "narration": return e.text.slice(0, 90);
    default: {
      const r = e as unknown as Record<string, unknown>;
      const { t: _t, at: _at, ...rest } = r; void _t; void _at;
      return JSON.stringify(rest).slice(0, 90);
    }
  }
}

export function EventStream({ events, dark = false }: { events: EngineEvent[]; dark?: boolean }) {
  const { d } = useLang();
  const last = events.slice(-60).reverse();
  return (
    <ul className="mono flex flex-col gap-1">
      {last.map((e, i) => {
        const ts = new Date(e.at).toISOString().slice(11, 23);
        return (<li key={`${e.at}-${i}`} className="flex items-start gap-2 leading-snug"><span className={`shrink-0 ${dark ? "text-white/40" : "text-muted"}`}>{ts}</span><span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${typeTone[e.t] ?? "bg-paper-2"}`}>{e.t}</span><span className={`break-all ${dark ? "text-white/85" : "text-ink-2"}`}>{lineFor(e)}</span></li>);
      })}
      {!last.length ? <li className={dark ? "text-white/50" : "text-muted"}>{d.graphs.waiting}</li> : null}
    </ul>
  );
}
