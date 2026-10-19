"use client";
import type { ChainTx, PolicyDecision, EngineEvent } from "@/engine/types";
import { StatusIcon } from "./StatusIcon";

// Small SVG charts. Thin marks, ink for money in, gold for money out, a hatch for slashes. No red, no green.

const IN = "#14213D", OUT = "#C9A227", BAD = "url(#hatch)", WARN = "#9A5B00", GRID = "#E4E1D8", INK = "#14213D", MUTED = "#4A5568";

const Hatch = () => <defs><pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#fff" /><rect width="2" height="4" fill={INK} /></pattern></defs>;
const Key = ({ fill, label }: { fill: string; label: string }) => <span className="flex items-center gap-1.5"><svg width="10" height="10" aria-hidden><Hatch /><rect width="10" height="10" rx="2" fill={fill} stroke={INK} strokeWidth={fill === BAD ? 1 : 0} /></svg>{label}</span>;
const inbound = new Set(["fee_in", "top_up", "bounty", "release"]);

export function CashFlow({ txs }: { txs: ChainTx[] }) {
  const items = [...txs].reverse().filter((t) => t.kind !== "title" && t.kind !== "lock").slice(-24);
  const max = Math.max(1, ...items.map((t) => t.amount));
  const W = 320, H = 120, pad = 24;
  const bw = Math.max(4, (W - pad * 2) / Math.max(items.length, 12) - 3);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg">Cash flow per transaction</h2><span className="flex gap-3 text-[13px] text-ink-2"><Key fill={IN} label="in" /><Key fill={OUT} label="out" /><Key fill={BAD} label="slash" /></span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cash flow per transaction"><Hatch />
        {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={pad} x2={W - 4} y1={H - 18 - g * (H - 30)} y2={H - 18 - g * (H - 30)} stroke={GRID} strokeWidth="1" />)}
        <line x1={pad} x2={W - 4} y1={H - 18} y2={H - 18} stroke={MUTED} />
        {items.map((t, i) => {
          const h = (t.amount / max) * (H - 30);
          const col = t.kind === "slash" || t.kind === "refund" ? BAD : inbound.has(t.kind) ? IN : OUT;
          return <g key={t.hash}><title>{`${t.label}: ${t.amount}`}</title><rect x={pad + i * (bw + 3)} y={H - 18 - h} width={bw} height={h} rx="1.5" fill={col} stroke={col === BAD ? INK : "none"} strokeWidth="0.75" /></g>;
        })}
        <text x={pad} y={H - 4} fontSize="9" fill={MUTED}>first</text><text x={W - 4} y={H - 4} fontSize="9" fill={MUTED} textAnchor="end">latest</text>
        <text x={pad - 4} y={14} fontSize="9" fill={MUTED} textAnchor="end">{max}</text>
      </svg>
      {!items.length ? <div className="text-[15px] text-ink-2">No transactions yet.</div> : null}
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
      <h2 className="mb-3 text-lg">Bond over the run, with the minimum</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bond over the run">
        {[0.5, 1].map((g) => <line key={g} x1={pad} x2={W - 6} y1={y(max * g)} y2={y(max * g)} stroke={GRID} />)}
        {pts.length ? <line x1={pad} x2={W - 6} y1={y(min)} y2={y(min)} stroke={WARN} strokeDasharray="4 3" /> : null}
        {pts.length ? <text x={W - 6} y={y(min) - 3} fontSize="10" fill={WARN} textAnchor="end">minimum {min}</text> : null}
        <path d={path} fill="none" stroke={IN} strokeWidth="2" strokeLinejoin="round" />
        {pts.length ? <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1].b)} r="4" fill={IN} stroke="white" strokeWidth="2" /> : null}
        {pts.length ? <text x={x(pts.length - 1) - 8} y={y(pts[pts.length - 1].b) - 8} fontSize="10" fill={INK} textAnchor="end" fontWeight="600">{pts[pts.length - 1].b.toFixed(0)}</text> : null}
      </svg>
      {!pts.length ? <div className="text-[15px] text-ink-2">No state yet.</div> : null}
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
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg">Policy checks by rule</h2><span className="flex gap-3 text-[13px] text-ink-2"><Key fill={IN} label="passed" /><Key fill={WARN} label="failed" /></span></div>
      <ul className="flex flex-col gap-1.5">
        {rows.map(([rule, r]) => (
          <li key={rule} className="grid grid-cols-[130px_1fr_36px] items-center gap-2 text-[13px]">
            <span className="truncate text-ink-2">{rule}</span>
            <span className="flex h-2 overflow-hidden rounded-full bg-paper"><i style={{ width: `${(r.ok / max) * 100}%`, background: IN }} /><i style={{ width: `${(r.bad / max) * 100}%`, background: WARN, marginLeft: r.bad ? 2 : 0 }} /></span>
            <span className="num text-right text-ink-2">{r.ok + r.bad}</span>
          </li>
        ))}
        {!rows.length ? <li className="text-[15px] text-ink-2">No checks yet.</li> : null}
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
      <h2 className="mb-3 text-lg">Event density over the run</h2>
      <svg viewBox="0 0 320 60" className="w-full" role="img" aria-label="Event density">
        {bins.map((b, i) => <rect key={i} x={6 + i * 13} y={56 - (b / max) * 50} width={10} height={(b / max) * 50} rx="1.5" fill={IN} opacity={0.25 + 0.75 * (i / 23)} />)}
      </svg>
    </div>
  );
}

const typeLabel: Record<string, string> = { chain: "Chain", policy: "Policy", intent: "Intent", "agent.message": "Message", machine: "Machine", job: "Job", attack: "Attack", narration: "Note", button: "Button", done: "Done" };

export function EventStream({ events }: { events: EngineEvent[]; dark?: boolean }) {
  const last = events.slice(-60).reverse();
  return (
    <ul className="flex flex-col text-[14px]">
      {last.map((e, i) => {
        const line = e.t === "chain" ? `${e.tx.kind} ${e.tx.amount} ${e.tx.hash.slice(0, 10)} blk ${e.tx.block}` : e.t === "policy" ? `${e.decision.intentId} ${e.decision.verdict} ${e.decision.lines.filter(l => !l.ok).map(l => l.rule).join(",") || "all rules pass"}` : e.t === "intent" ? `${e.intent.id} ${e.intent.kind} ${e.intent.actor} ${e.intent.amount ?? ""} ${e.intent.signature.slice(0, 12)}` : e.t === "agent.message" ? `${e.from}>${e.to} ${e.untrusted ? "[untrusted] " : ""}${e.text.slice(0, 70)}` : e.t === "machine" ? `${e.state.id} ${e.state.status} bal ${e.state.balance.toFixed(1)} bond ${e.state.bond.toFixed(0)} lease ${e.state.leaseBalance.toFixed(1)} pos ${e.state.position.x.toFixed(1)},${e.state.position.z.toFixed(1)}` : e.t === "job" ? `${e.job.id} ${e.job.status} fee ${e.job.fee}` : e.t === "attack" ? `${e.blocked ? "BLOCKED" : "PASSED"} ${e.where} ${e.name.slice(0, 50)}` : e.t === "button" ? `${e.waiting ? "WAIT" : "PRESSED"} ${e.what}` : e.t === "done" ? e.summary.slice(0, 90) : e.text.slice(0, 90);
        const ts = new Date(e.at).toISOString().slice(11, 23);
        const flag = e.t === "attack" ? (e.blocked ? "ok" : "warn") : e.t === "button" && e.waiting ? "warn" : e.t === "chain" && e.tx.kind === "slash" ? "slashed" : null;
        return (<li key={`${e.at}-${i}`} className={`grid grid-cols-[76px_1fr] gap-2 sm:grid-cols-[100px_76px_1fr] border-b border-rule py-1.5 leading-snug last:border-b-0`}><span className="mono hidden text-[12px] text-ink-2 sm:block">{ts}</span><span className="flex items-start gap-1 font-semibold text-ink">{flag ? <StatusIcon kind={flag} size={13} /> : null}{typeLabel[e.t] ?? e.t}</span><span className="break-words text-ink-2">{line}</span></li>);
      })}
      {!last.length ? <li className="text-ink-2">Waiting for events. Start a run.</li> : null}
    </ul>
  );
}
