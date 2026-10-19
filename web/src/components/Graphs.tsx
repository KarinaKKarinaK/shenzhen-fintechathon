"use client";
import type { ChainTx, PolicyDecision, EngineEvent } from "@/engine/types";

// Small SVG charts. Thin marks, one hue per job, labels in ink, legend when two series.

const IN = "#3db1b8", OUT = "#6b5fb5", BAD = "#e0714f", GRID = "#e9e3d2", INK = "#1b2a2a", MUTED = "#7f8d8e";
const inbound = new Set(["fee_in", "top_up", "bounty", "release"]);

export function CashFlow({ txs }: { txs: ChainTx[] }) {
  const items = [...txs].reverse().filter((t) => t.kind !== "title" && t.kind !== "lock").slice(-24);
  const max = Math.max(1, ...items.map((t) => t.amount));
  const W = 320, H = 120, pad = 24;
  const bw = Math.max(4, (W - pad * 2) / Math.max(items.length, 12) - 3);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted"><span>Cash flow per transaction</span><span className="flex gap-3"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: IN }} />in</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: OUT }} />out</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: BAD }} />slash</span></span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cash flow per transaction">
        {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={pad} x2={W - 4} y1={H - 18 - g * (H - 30)} y2={H - 18 - g * (H - 30)} stroke={GRID} strokeWidth="1" />)}
        <line x1={pad} x2={W - 4} y1={H - 18} y2={H - 18} stroke="#cfc8b4" />
        {items.map((t, i) => {
          const h = (t.amount / max) * (H - 30);
          const col = t.kind === "slash" || t.kind === "refund" ? BAD : inbound.has(t.kind) ? IN : OUT;
          return <g key={t.hash}><title>{`${t.label}: ${t.amount}`}</title><rect x={pad + i * (bw + 3)} y={H - 18 - h} width={bw} height={h} rx="2" fill={col} /></g>;
        })}
        <text x={pad} y={H - 4} fontSize="9" fill={MUTED}>first</text><text x={W - 4} y={H - 4} fontSize="9" fill={MUTED} textAnchor="end">latest</text>
        <text x={pad - 4} y={14} fontSize="9" fill={MUTED} textAnchor="end">{max}</text>
      </svg>
      {!items.length ? <div className="text-xs text-muted">No transactions yet.</div> : null}
    </div>
  );
}

export function BondHistory({ events }: { events: EngineEvent[] }) {
  const pts = events.filter((e): e is Extract<EngineEvent, { t: "machine" }> => e.t === "machine").map((e) => ({ b: e.state.bond, min: e.state.bondMin }));
  const W = 320, H = 110, pad = 26;
  const max = Math.max(1, ...pts.map((p) => Math.max(p.b, p.min * 1.3)));
  const x = (i: number) => pad + (i / Math.max(pts.length - 1, 1)) * (W - pad - 6);
  const y = (v: number) => H - 16 - (v / max) * (H - 28);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.b).toFixed(1)}`).join(" ");
  const min = pts[0]?.min ?? 0;
  return (
    <div>
      <div className="mb-2 text-xs text-muted">Bond over the run, with the minimum</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bond over the run">
        {[0.5, 1].map((g) => <line key={g} x1={pad} x2={W - 6} y1={y(max * g)} y2={y(max * g)} stroke={GRID} />)}
        {pts.length ? <line x1={pad} x2={W - 6} y1={y(min)} y2={y(min)} stroke={BAD} strokeDasharray="4 3" /> : null}
        {pts.length ? <text x={W - 6} y={y(min) - 3} fontSize="9" fill={BAD} textAnchor="end">minimum {min}</text> : null}
        <path d={path} fill="none" stroke={IN} strokeWidth="2" strokeLinejoin="round" />
        {pts.length ? <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1].b)} r="4" fill={IN} stroke="white" strokeWidth="2" /> : null}
        {pts.length ? <text x={x(pts.length - 1) - 8} y={y(pts[pts.length - 1].b) - 8} fontSize="10" fill={INK} textAnchor="end" fontWeight="600">{pts[pts.length - 1].b.toFixed(0)}</text> : null}
      </svg>
      {!pts.length ? <div className="text-xs text-muted">No state yet.</div> : null}
    </div>
  );
}

export function RuleHits({ decisions }: { decisions: PolicyDecision[] }) {
  const map = new Map<string, { ok: number; bad: number }>();
  decisions.forEach((d) => d.lines.forEach((l) => { const r = map.get(l.rule) ?? { ok: 0, bad: 0 }; if (l.ok) r.ok += 1; else r.bad += 1; map.set(l.rule, r); }));
  const rows = [...map.entries()].sort((a, b) => b[1].ok + b[1].bad - (a[1].ok + a[1].bad));
  const max = Math.max(1, ...rows.map(([, r]) => r.ok + r.bad));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted"><span>Policy checks by rule</span><span className="flex gap-3"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: IN }} />passed</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: BAD }} />failed</span></span></div>
      <ul className="flex flex-col gap-1.5">
        {rows.map(([rule, r]) => (
          <li key={rule} className="grid grid-cols-[120px_1fr_36px] items-center gap-2 text-xs">
            <span className="truncate text-ink-2">{rule}</span>
            <span className="flex h-2.5 overflow-hidden rounded-full bg-[#eee8d8]"><i style={{ width: `${(r.ok / max) * 100}%`, background: IN }} /><i style={{ width: `${(r.bad / max) * 100}%`, background: BAD, marginLeft: 2 }} /></span>
            <span className="tabular-nums text-right text-muted">{r.ok + r.bad}</span>
          </li>
        ))}
        {!rows.length ? <li className="text-xs text-muted">No checks yet.</li> : null}
      </ul>
    </div>
  );
}

export function EventRate({ events }: { events: EngineEvent[] }) {
  const bins = new Array(24).fill(0);
  if (events.length) {
    const t0 = events[0].at, t1 = events[events.length - 1].at, span = Math.max(1, t1 - t0);
    events.forEach((e) => { bins[Math.min(23, Math.floor(((e.at - t0) / span) * 24))] += 1; });
  }
  const max = Math.max(1, ...bins);
  return (
    <div>
      <div className="mb-2 text-xs text-muted">Event density over the run</div>
      <svg viewBox="0 0 320 60" className="w-full" role="img" aria-label="Event density">
        {bins.map((b, i) => <rect key={i} x={6 + i * 13} y={56 - (b / max) * 50} width={10} height={(b / max) * 50} rx="2" fill={IN} opacity={0.35 + 0.65 * (i / 23)} />)}
      </svg>
    </div>
  );
}

const typeTone: Record<string, string> = { chain: "bg-turq/15 text-turq-deep", policy: "bg-plum/15 text-plum", intent: "bg-sand-2 text-ink", "agent.message": "bg-cream text-ink-2", machine: "bg-[#eef3f3] text-ink-2", job: "bg-sand-2 text-ink", attack: "bg-coral/15 text-coral", narration: "bg-cream text-muted", button: "bg-turq text-white", done: "bg-ink text-white" };

export function EventStream({ events }: { events: EngineEvent[] }) {
  const last = events.slice(-60).reverse();
  return (
    <ul className="mono flex flex-col gap-1">
      {last.map((e, i) => {
        const line = e.t === "chain" ? `${e.tx.kind} ${e.tx.amount} ${e.tx.hash.slice(0, 10)} blk ${e.tx.block}` : e.t === "policy" ? `${e.decision.intentId} ${e.decision.verdict} ${e.decision.lines.filter(l => !l.ok).map(l => l.rule).join(",") || "all rules pass"}` : e.t === "intent" ? `${e.intent.id} ${e.intent.kind} ${e.intent.actor} ${e.intent.amount ?? ""} ${e.intent.signature.slice(0, 12)}` : e.t === "agent.message" ? `${e.from}>${e.to} ${e.untrusted ? "[untrusted] " : ""}${e.text.slice(0, 70)}` : e.t === "machine" ? `${e.state.id} ${e.state.status} bal ${e.state.balance.toFixed(1)} bond ${e.state.bond.toFixed(0)} lease ${e.state.leaseBalance.toFixed(1)} pos ${e.state.position.x.toFixed(1)},${e.state.position.z.toFixed(1)}` : e.t === "job" ? `${e.job.id} ${e.job.status} fee ${e.job.fee}` : e.t === "attack" ? `${e.blocked ? "BLOCKED" : "PASSED"} ${e.where} ${e.name.slice(0, 50)}` : e.t === "button" ? `${e.waiting ? "WAIT" : "PRESSED"} ${e.what}` : e.t === "done" ? e.summary.slice(0, 90) : e.text.slice(0, 90);
        const ts = new Date(e.at).toISOString().slice(11, 23);
        return (<li key={`${e.at}-${i}`} className="flex items-start gap-2 leading-snug"><span className="shrink-0 text-muted">{ts}</span><span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${typeTone[e.t] ?? "bg-cream"}`}>{e.t}</span><span className="break-all text-ink-2">{line}</span></li>);
      })}
      {!last.length ? <li className="text-muted">Waiting for events. Start a run.</li> : null}
    </ul>
  );
}
