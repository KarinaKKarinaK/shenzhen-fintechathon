"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChainTx, Intent, MachineState, PolicyDecision, PolicyLine, Job, Side } from "@/engine/types";
import { short } from "@/engine/policy";
import type { Gate, Understood, MessageEv, PlanItem, Solvency, Telemetry, Proof, LooseEvent } from "./useRun";

const kindLabel: Record<string, string> = { fee_in: "Fee in", instalment: "Instalment", energy: "Energy", rail: "Rail fee", cover: "Cover", bond_fill: "Bond fill", slash: "Slash", bounty: "Bounty", title: "Title transfer", lock: "Fee locked", release: "Release", refund: "Held", top_up: "Top up" };
const inbound = new Set(["fee_in", "top_up", "bounty", "release"]);
const danger = new Set(["slash", "refund"]);

export function ChainFeed({ txs, compact = false }: { txs: ChainTx[]; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {txs.slice(0, compact ? 6 : 40).map((tx) => (
          <motion.div key={tx.hash} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`mined rounded-md border px-3 py-2 ${danger.has(tx.kind) ?"border-red/50 bg-red-soft/50": inbound.has(tx.kind) ?"border-gold/60 bg-gold-soft/40":"border-slate/40 bg-paper-2"}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{kindLabel[tx.kind] ?? tx.kind}</span>
              <span className={`text-sm tabular-nums ${danger.has(tx.kind) ?"text-red": inbound.has(tx.kind) ?"text-red-deep":"text-slate"}`}>{tx.kind === "title" ? "title" : `${inbound.has(tx.kind) ? "+" : "-"}${tx.amount}`}</span>
            </div>
            <div className="text-[13px] text-muted">{tx.label}</div>
            <div className="mono mt-1 flex items-center justify-between text-muted">
              {tx.explorer ? <a className="underline decoration-gold hover:text-red-deep" href={tx.explorer} target="_blank" rel="noreferrer">{short(tx.hash)}</a> : <span title={tx.hash}>{short(tx.hash)}</span>}
              <span>block {tx.block}{tx.simulated ? " sim" : ""}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {txs.length === 0 ? <div className="text-sm text-muted">No transactions yet. Start a run.</div> : null}
    </div>
  );
}

// Gate strip under an untrusted message: what the gate decided before the agent read it.
export function gateTone(action?: string) {
  return action === "pass" ? "bg-gold text-ink" : action === "refuse" ? "bg-red text-white" : action === "redact" || action === "hold" ? "bg-[#e8a317] text-ink" : "bg-paper-2 text-muted";
}

function GateStrip({ g }: { g: Gate }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5 border-t border-line/70 pt-1.5 text-[12px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted">gate</span>
        <span className={`pill !px-1.5 !py-0.5 !text-[9px] ${gateTone(g.action)}`}>{g.action ?? "pending"}</span>
        {(g.categories ?? []).map((c) => <span key={c} className="rounded-sm bg-paper-2 px-1.5 py-0.5 text-ink-2">{c}</span>)}
        {g.reason ? <span className="text-muted">{g.reason}</span> : null}
        {g.framed ? <button type="button" onClick={() => setOpen(!open)} className="ml-auto underline decoration-gold text-ink-2">{open ? "hide" : "How the agent sees it"}</button> : null}
      </div>
      {open && g.framed ? <pre className="mono mt-1.5 whitespace-pre-wrap break-all rounded-sm bg-ink p-2 text-[12px] text-white/85">{(g.preamble ? g.preamble + "\n" : "") + g.framed}</pre> : null}
    </div>
  );
}

function UnderstoodLine({ u }: { u: Understood }) {
  const by = u.by ?? u.source ?? "rules";
  const addr = u.hadAddress ?? u.addressInText;
  return (
    <div className="mt-1.5 border-t border-line/70 pt-1.5 text-[12px] text-ink-2">
      <span className="font-semibold text-ink">Understood:</span> {u.task ?? "task"}{u.window ? `, ${u.window}` : ""}{u.fee !== undefined ? `, fee ${u.fee}` : ""}{u.geofence ? `, geofence ${u.geofence}` : ""}
      <span className="ml-1.5 rounded-sm bg-paper-2 px-1.5 py-0.5 text-[12px]">by {by === "model" ? "model" : "rules"}</span>
      {u.payeeName === null && addr ? <span className="ml-1.5 rounded-sm bg-red-soft px-1.5 py-0.5 text-[12px] text-red">address in text ignored</span> : null}
    </div>
  );
}

function Facts({ m }: { m: MessageEv }) {
  const entries = Object.entries(m.facts ?? {});
  if (!entries.length && m.grounded === undefined) return null;
  return (
    <div className="mt-1.5 border-t border-white/15 pt-1.5 text-[12px]">
      <div className="flex flex-wrap gap-1">{entries.map(([k, v]) => <span key={k} className="rounded-sm bg-white/12 px-1.5 py-0.5 text-white/90"><span className="text-white/60">{k}</span> {String(v)}</span>)}</div>
      <div className="mt-1 flex items-center gap-2 text-white/60">
        <span>numbers from economics(), text by {m.source ?? "template"}</span>
        {m.grounded === false ? <span className="rounded-sm bg-red px-1.5 py-0.5 text-[12px] text-white">rejected, template used</span> : <span className="text-gold" aria-label="grounded">&#10003; grounded</span>}
      </div>
    </div>
  );
}

export function AgentFeed({ messages, gates = {}, understood = {}, frozen = false }: { messages: MessageEv[]; gates?: Record<number, Gate>; understood?: Record<string, Understood>; frozen?: boolean }) {
  const who: Record<string, string> = { machine: "Machine agent", requester: "Requester agent", lender: "Lender agent", hunter: "Hunter", operator: "Operator" };
  const lastReq = messages.map((m, i) => (m.from === "requester" ? i : -1)).filter((i) => i >= 0).pop();
  const u = understood.last;
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {messages.map((m, i) => (
          <motion.div key={`${m.at}-${i}`} initial={{ opacity: 0, x: m.from === "machine" ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} className={`max-w-[94%] rounded-lg px-3 py-2 text-sm ${m.from ==="machine"?"self-end bg-ink text-white":"self-start bg-paper-2"}`}>
            <div className={`mb-0.5 flex items-center gap-2 text-[12px] ${m.from ==="machine"?"text-gold-soft":"text-muted"}`}>
              <span>{who[m.from] ?? m.from}{m.untrusted ? " (untrusted data)" : ""}</span>
              {m.from === "machine" && frozen ? <span className="rounded-sm bg-red px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">frozen</span> : null}
            </div>
            {m.text}
            {m.untrusted && gates[i] ? <GateStrip g={gates[i]} /> : null}
            {i === lastReq && u ? <UnderstoodLine u={{ ...u, hadAddress: u.hadAddress ?? /0x[a-fA-F0-9]{40}/.test(m.text) }} /> : null}
            {m.from === "machine" ? <Facts m={m} /> : null}
          </motion.div>
        ))}
      </AnimatePresence>
      {messages.length === 0 ? <div className="text-sm text-muted">The agents have not spoken yet.</div> : null}
    </div>
  );
}

const tierTone: Record<string, string> = { L0: "bg-paper-2 text-muted", L1: "bg-gold-soft text-ink", L2: "bg-gold text-ink", L3: "bg-red text-white" };
function Tier({ line }: { line: PolicyLine & { tier?: string | number } }) {
  if (line.tier === undefined) return null;
  const t = typeof line.tier === "number" ? `L${line.tier}` : String(line.tier);
  return <span className={`rounded-sm px-1 py-0.5 text-[9px] font-bold ${tierTone[t] ??"bg-paper-2"}`}>{t}</span>;
}

function Chip({ k, v }: { k: string; v: unknown }) {
  if (v === undefined || v === null || v === "") return null;
  return <span className="rounded-sm bg-paper-2 px-1.5 py-0.5 text-[12px]"><span className="text-muted">{k}</span> <span className="mono text-ink">{String(v)}</span></span>;
}

function Verdict({ v }: { v: PolicyDecision["verdict"] }) {
  const cls = v === "allow" ? "text-gold-deep" : v === "deny" ? "text-red" : "text-slate";
  return <span className={`text-sm font-semibold ${cls}`}>{v === "allow" ? "Allowed" : v === "deny" ? "Blocked" : "Needs the button"}</span>;
}

// Last five decisions pinned. The newest shows the typed intent, the key and every rule with its tier.
export function PolicyCard({ decisions, intents }: { decisions: PolicyDecision[]; intents: Intent[] }) {
  if (!decisions.length) return <div className="text-sm text-muted">No decision yet. The policy engine checks every signed intent.</div>;
  const byId = new Map(intents.map((i) => [i.id, i as Intent & { nonce?: number; signer?: string }]));
  return (
    <div className="flex flex-col gap-2">
      {decisions.slice(0, 5).map((d, n) => {
        const it = byId.get(d.intentId);
        const signer = (d as PolicyDecision & { signer?: string }).signer ?? it?.signer;
        const sigLine = d.lines.find((l) => l.rule === "signature");
        return (
          <motion.div key={d.intentId + n} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={`rounded-lg border px-3 py-2 ${d.verdict ==="deny"?"border-l-4 border-l-red border-line":"border-line"} ${n > 0 ?"opacity-80":""}`}>
            <div className="flex items-center justify-between">
              <span className="mono text-muted">{d.intentId}{it ? ` ${it.kind}` : ""}</span>
              <Verdict v={d.verdict} />
            </div>
            {n === 0 && it ? (
              <div className="mt-1.5">
                <div className="mb-1 text-[12px] tracking-wider text-muted">Intent</div>
                <div className="flex flex-wrap gap-1">
                  <Chip k="actor" v={it.actor} /><Chip k="kind" v={it.kind} /><Chip k="payee" v={it.payee ? short(it.payee) : undefined} /><Chip k="amount" v={it.amount} /><Chip k="jobId" v={it.jobId} /><Chip k="geofence" v={it.geofence} /><Chip k="confirmed" v={it.confirmed} /><Chip k="nonce" v={it.nonce} />
                </div>
                <div className="mono mt-1 break-all text-[12px] text-muted">sig {it.signature}</div>
              </div>
            ) : null}
            {n === 0 || d.verdict !== "allow" ? (
              <ul className="mt-1.5 flex flex-col gap-1">
                {d.lines.map((l, i) => (
                  <motion.li key={l.rule} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: n === 0 ? i * 0.06 : 0 }} className="flex items-start gap-2 text-sm">
                    <span className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${l.ok ?"bg-gold":"bg-red"}`} aria-hidden />
                    <span className="flex flex-wrap items-center gap-1.5"><span className="font-medium">{l.rule}</span><Tier line={l} /><span className="text-muted">{l.detail}</span>{l === sigLine && signer ? <span className="mono text-muted">signer {short(signer)}</span> : null}</span>
                  </motion.li>
                ))}
              </ul>
            ) : <div className="mt-1 text-[12px] text-muted">{d.lines.length} rules, all pass</div>}
          </motion.div>
        );
      })}
    </div>
  );
}

// Four lines that light in sequence: the mechanism behind a slash.
export function ProofCard({ proof }: { proof?: Proof }) {
  if (!proof) return <div className="text-sm text-muted">No violation yet. A signed intent that breaks a rule is proof anyone can submit.</div>;
  const lines = [
    `signed intent ${short(proof.intentHash ?? proof.intentId)}`,
    `rule broken: ${proof.rule ?? "unknown"}`,
    `signature verified, signer ${short(proof.signer)}`,
    `slashed ${proof.slash ?? 0}, bounty ${proof.bounty ?? 0} to hunter ${short(proof.submitterAddr ?? proof.submitter)}`,
  ];
  return (
    <ol className="flex flex-col gap-1.5">
      {lines.map((l, i) => (
        <motion.li key={l} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.35 }} className="flex items-center gap-2 text-sm">
          <span className={` grid h-5 w-5 shrink-0 place-items-center text-[12px] font-bold ${i === 3 ?"bg-red text-white":"bg-gold text-ink"}`}>{i + 1}</span>
          <span className={i === 3 ? "font-semibold text-red" : "text-ink-2"}>{l}</span>
        </motion.li>
      ))}
    </ol>
  );
}

export function BondGauge({ value, min, slashes, side, solvency }: { value: number; min: number; slashes: number; side?: Side; solvency?: Solvency }) {
  const max = Math.max(min * 1.6, value, 1);
  const r = 44, c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  const minPct = Math.min(1, min / max);
  const low = value < min;
  const sub = solvency ? (solvency.covers ? `worst case ${solvency.worst}, bond ${solvency.bond ?? value}, covers` : "earning in, capped task") : low ? "No new tasks until the button tops it up" : "Covers the worst case";
  return (
    <div className="flex items-center gap-4">
      <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`Bond ${value} of minimum ${min}`}>
        <circle cx="56" cy="56" r={r} fill="none" stroke="#E4E1D8" strokeWidth="10" />
        <circle cx="56" cy="56" r={r} fill="none" stroke={low ? "#B8322A" : "#8A6A1F"} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${pct * c} ${c}`} transform="rotate(-90 56 56)" style={{ transition: "stroke-dasharray 600ms ease, stroke 300ms" }} />
        <line x1="56" y1="4" x2="56" y2="16" stroke="#1F1A17" strokeWidth="2" transform={`rotate(${minPct * 360} 56 56)`} />
        <text x="56" y="52" textAnchor="middle" fontSize="20" fontWeight="600" fill="#1F1A17">{value.toFixed(0)}</text>
        <text x="56" y="68" textAnchor="middle" fontSize="10" fill="#5C524A">min {min}</text>
      </svg>
      <div className="text-sm">
        <div className="font-medium">{low ? "Below the minimum" : "Bond"}</div>
        <div className={solvency?.covers ? "text-gold-deep" : "text-muted"}>{sub}</div>
        <div className="text-muted">{slashes} slash{slashes === 1 ? "" : "es"} on record</div>
        <div className="text-[13px] text-muted">{side === "neighbour" ? `Earned in from task fees, ${value.toFixed(0)} so far` : "Posted up front by the operator"}</div>
      </div>
    </div>
  );
}

export function LeaseBar({ m }: { m?: MachineState }) {
  if (!m) return null;
  const paid = m.leaseTotal - m.leaseBalance;
  const pct = Math.min(100, (paid / m.leaseTotal) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span>Lease paid</span><span className="tabular-nums">{paid.toFixed(2)} of {m.leaseTotal}</span></div>
      <div className="h-3 overflow-hidden rounded-full bg-paper-2"><motion.div className={`h-full ${m.owned ?"bg-gold":"bg-slate"}`} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 80, damping: 20 }} /></div>
      <div className="mt-1 text-[13px] text-muted">{m.owned ? "Title transferred. The machine belongs to the operator." : "Instalments are taken from every fee by rule."}</div>
    </div>
  );
}

export function BalanceSheet({ m, series }: { m?: MachineState; series: number[] }) {
  const max = Math.max(1, ...series);
  return (
    <div>
      <div className="flex items-end justify-between">
        <div><div className="text-[13px] text-muted">Operating balance</div><div className="kpi tabular-nums">{(m?.balance ?? 0).toFixed(2)}</div></div>
        <div className="text-right text-[13px] text-muted">reserve rule {m?.reserve ?? 0}<br />{m?.tasksDone ?? 0} tasks done</div>
      </div>
      <svg viewBox="0 0 120 32" className="mt-2 h-8 w-full" role="img" aria-label="Balance over the run">
        {series.map((v, i) => <rect key={i} x={(i / Math.max(series.length, 1)) * 120} y={32 - (v / max) * 30} width={Math.max(1, 120 / Math.max(series.length, 1) - 1)} height={(v / max) * 30} rx="1" fill="#8A6A1F" opacity={0.35 + 0.65 * (i / Math.max(series.length, 1))} />)}
      </svg>
    </div>
  );
}

// The day's work ranked by margin per mu. Declined rows stay visible with the reason.
export function PlanTable({ plan }: { plan?: PlanItem[] }) {
  if (!plan?.length) return null;
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-[13px] text-muted"><span>Plan, ranked by margin per mu</span><span>{plan.filter((p) => !p.declined).length} of {plan.length} taken</span></div>
      <table className="ledger w-full text-[13px]">
        <thead><tr><th className="text-left">#</th><th className="text-left">Job</th><th className="text-right">Fee</th><th className="text-right">Margin / mu</th><th className="text-left">Reason</th></tr></thead>
        <tbody>
          {plan.map((p, i) => {
            const declined = p.declined ?? (p.clears === false || p.order === null);
            return (
              <tr key={p.jobId ?? i} className={declined ? "text-muted" : ""}>
                <td>{declined ? "-" : (p.order ?? p.rank ?? i + 1)}</td><td className={declined ? "line-through decoration-red/60" : "text-ink"}>{p.title ?? p.jobId}</td><td className="text-right tabular-nums">{p.fee ?? ""}</td><td className="text-right tabular-nums">{(p.marginPerMu ?? p.margin ?? 0).toFixed(2)}</td><td>{declined ? <span className="pill !px-1.5 !py-0.5 !text-[9px] bg-red-soft text-red">declined</span> : null} {p.reason ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Plausibility: area the track supports against the area claimed.
export function TelemetryCard({ t }: { t?: Telemetry }) {
  if (!t) return <div className="text-sm text-muted">No flight log checked yet.</div>;
  const supported = t.areaSupported ?? 0, claimed = t.areaClaimed ?? 0;
  const ratio = t.ratio ?? (supported > 0 ? claimed / supported : 0);
  const held = t.held ?? (t.ok === false);
  const pct = Math.min(100, (supported / Math.max(claimed, supported, 1e-9)) * 100);
  const track = t.trackM ?? t.track;
  return (
    <div className="text-sm">
      <div className="mb-2 flex items-center justify-between"><span className="font-medium">Telemetry check</span><span className={`pill ${held ?"bg-red text-white":"bg-gold text-ink"}`}>{held ? "held" : "ok"}</span></div>
      <div className="grid grid-cols-3 gap-2 text-[13px]">
        <div className="tile !p-2"><div className="text-muted">track</div><div className="tabular-nums">{track ?? "?"} m</div></div>
        <div className="tile !p-2"><div className="text-muted">swath</div><div className="tabular-nums">{t.swath ?? "?"} m</div></div>
        <div className="tile !p-2"><div className="text-muted">time</div><div className="tabular-nums">{t.seconds ?? "?"} s</div></div>
      </div>
      <div className="mt-2 flex justify-between text-[13px]"><span>area supported <b className="tabular-nums">{supported}</b> mu</span><span>claimed <b className="tabular-nums">{claimed}</b> mu</span></div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-red/15"><div className={`h-full ${held ?"bg-red":"bg-gold"}`} style={{ width: `${pct}%` }} /></div>
      <div className="mt-1 text-[13px] text-muted">{held ? `claimed ${ratio.toFixed(1)}x what the track supports, fee held` : `ratio ${ratio.toFixed(2)}, within tolerance`}</div>
    </div>
  );
}

export function JobList({ jobs, hold = 20 }: { jobs: Record<string, Job>; hold?: number }) {
  const tone: Record<Job["status"], string> = { posted: "bg-paper-2", locked: "bg-paper-2 text-slate", running: "bg-gold-soft text-red-deep", confirmed: "bg-gold-soft text-red-deep", released: "bg-gold text-ink", held: "bg-red/15 text-red", declined: "bg-paper-2 text-muted" };
  const list = Object.values(jobs);
  if (!list.length) return <div className="text-sm text-muted">No jobs yet.</div>;
  return (
    <ul className="flex flex-col gap-2">
      {list.map((j) => (
        <li key={j.id} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm">
          <div className="min-w-0"><div className="font-medium">{j.title}</div><div className="text-[13px] text-muted">{j.requester}, {j.window}{j.split ? `, split owner ${j.split.owner} instalment ${j.split.instalment} rail ${j.split.rail} bond ${j.split.bond}` : ""}</div>
            {j.status === "released" ? <span className="mt-1 inline-block rounded-sm bg-gold-soft px-1.5 py-0.5 text-[12px] text-ink-2">hold {Math.min(hold, j.fee)}, releases in 24h</span> : null}</div>
          <div className="flex items-center gap-2"><span className="tabular-nums">{j.fee}</span><span className={`pill ${tone[j.status]}`}>{j.status}</span></div>
        </li>
      ))}
    </ul>
  );
}

export function Narration({ lines }: { lines: string[] }) {
  const last = lines[lines.length - 1];
  return (
    <AnimatePresence mode="wait">
      <motion.p key={last ?? "none"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm leading-relaxed text-ink-2">
        {last ?? "Press start. Each step is narrated as the agents act."}
      </motion.p>
    </AnimatePresence>
  );
}

// The top permission tier. While waiting, the judge presses it; the events come back from the API.
export function ButtonRing({ b, scenario, onEvents }: { b?: { waiting: boolean; what: string; signer?: string }; scenario: Side; onEvents?: (ev: LooseEvent[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!b) return null;
  async function press() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/button", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ what: b!.what, amount: 20, scenario }) });
      if (!r.ok) throw new Error(`button returned ${r.status}`);
      const j = (await r.json()) as { events?: LooseEvent[] };
      onEvents?.(j.events ?? []);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="flex items-center gap-3">
      {b.waiting ? (
        <button type="button" onClick={press} disabled={busy} className="pulse relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-red text-[12px] font-bold tracking-wider text-white shadow-[0_0_0_4px_#f6d9de] transition active:scale-95 disabled:opacity-60" aria-label="Press the operator button">{busy ? "..." : "Press"}</button>
      ) : <span className="relative inline-block h-10 w-10 rounded-full bg-gold" aria-hidden />}
      <div className="text-sm">
        <div className="font-medium">{b.waiting ? "Waiting for the operator's button" : "Button pressed"}</div>
        <div className="text-muted">{b.what}</div>
        <div className="text-[13px] text-muted">operator only{!b.waiting && b.signer ? <span className="mono ml-1">signer {short(b.signer)}</span> : ""}</div>
        {err ? <div className="text-[13px] text-red">{err}</div> : null}
      </div>
    </div>
  );
}
