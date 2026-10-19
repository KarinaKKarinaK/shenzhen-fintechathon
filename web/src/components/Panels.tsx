"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { ChainTx, Intent, MachineState, PolicyDecision, EngineEvent, Job } from "@/engine/types";
import { short } from "@/engine/policy";
import { Status, StatusIcon } from "./StatusIcon";

const kindLabel: Record<ChainTx["kind"], string> = { fee_in: "Fee in", instalment: "Instalment", energy: "Rail fee", cover: "Cover", bond_fill: "Bond fill", slash: "Slash", bounty: "Bounty", title: "Title transfer", lock: "Fee locked", release: "Release", refund: "Held", top_up: "Top up" };
const inbound = new Set(["fee_in", "top_up", "bounty", "release"]);

export function ChainFeed({ txs, compact = false }: { txs: ChainTx[]; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {txs.slice(0, compact ? 6 : 40).map((tx) => (
          <motion.div key={tx.hash} layout className="border-b border-rule py-2.5 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              {tx.kind === "slash" ? <Status kind="slashed">Bond slashed</Status> : tx.kind === "refund" ? <Status kind="warn">{kindLabel[tx.kind]}</Status> : <span className="font-medium">{kindLabel[tx.kind]}</span>}
              <span className="num font-semibold">{tx.kind === "title" ? "title" : `${inbound.has(tx.kind) ? "+" : "−"}${tx.amount}`}</span>
            </div>
            <div className="text-[15px] text-ink-2">{tx.label}</div>
            <div className="mono mt-1 flex items-center justify-between text-ink-2">
              {tx.explorer ? <a className="link font-normal" href={tx.explorer} target="_blank" rel="noreferrer">{short(tx.hash)}</a> : <span title={tx.hash}>{short(tx.hash)}</span>}
              <span>block {tx.block}{tx.simulated ? <span className="text-gold-text"> sim</span> : ""}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {txs.length === 0 ? <div className="text-ink-2">No transactions yet. Start a run.</div> : null}
    </div>
  );
}

export function AgentFeed({ messages }: { messages: Extract<EngineEvent, { t: "agent.message" }>[] }) {
  const who: Record<string, string> = { machine: "Machine agent", requester: "Requester agent", lender: "Lender agent", hunter: "Hunter", operator: "Operator" };
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {messages.slice(-8).map((m, i) => (
          <motion.div key={`${m.at}-${i}`} className={`max-w-[92%] rounded-lg px-3 py-2 text-[15px] ${m.from === "machine" ? "self-end bg-ink text-white" : "self-start border border-rule bg-paper"}`}>
            <div className={`mb-0.5 text-[13px] ${m.from === "machine" ? "text-white/75" : "text-ink-2"}`}>{who[m.from] ?? m.from}{m.untrusted ? " (untrusted data)" : ""}</div>
            {m.text}
          </motion.div>
        ))}
      </AnimatePresence>
      {messages.length === 0 ? <div className="text-ink-2">The agents have not spoken yet.</div> : null}
    </div>
  );
}

export function PolicyCard({ decision, intent }: { decision?: PolicyDecision; intent?: Intent }) {
  if (!decision) return <div className="text-ink-2">No decision yet. The policy engine checks every signed intent.</div>;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="mono text-ink-2">{decision.intentId}{intent ? ` ${intent.kind}` : ""}</span>
        {decision.verdict === "allow" ? <Status kind="pass">Allowed</Status> : decision.verdict === "deny" ? <Status kind="ok">Blocked</Status> : <Status kind="warn">Needs the button</Status>}
      </div>
      <ul className="flex flex-col gap-1">
        {decision.lines.map((l) => (
          <li key={l.rule} className="flex items-start gap-2 text-[15px]">
            <span className="mt-0.5"><StatusIcon kind={l.ok ? "pass" : "fail"} /></span>
            <span><span className="font-medium">{l.rule}</span> <span className={l.ok ? "text-ink-2" : "text-warn"}>{l.detail}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BondGauge({ value, min, slashes }: { value: number; min: number; slashes: number }) {
  const max = Math.max(min * 1.6, value, 1);
  const r = 44, c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  const minPct = Math.min(1, min / max);
  const low = value < min;
  return (
    <div className="flex items-center gap-4">
      <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`Bond ${value} of minimum ${min}`}>
        <circle cx="56" cy="56" r={r} fill="none" stroke="#E4E1D8" strokeWidth="8" />
        <circle cx="56" cy="56" r={r} fill="none" stroke={low ? "#9A5B00" : "#1F1A17"} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${pct * c} ${c}`} transform="rotate(-90 56 56)" style={{ transition: "stroke-dasharray 600ms ease, stroke 300ms" }} />
        <line x1="56" y1="4" x2="56" y2="16" stroke="#C9A227" strokeWidth="2.5" transform={`rotate(${minPct * 360} 56 56)`} />
        <text x="56" y="54" textAnchor="middle" fontSize="22" fontWeight="600" fill="#1F1A17" fontFamily="var(--font-mono)">{value.toFixed(0)}</text>
        <text x="56" y="72" textAnchor="middle" fontSize="12" fill="#5C524A">min {min}</text>
      </svg>
      <div className="text-[15px]">
        <h2 className="mb-1 text-lg">Bond</h2>
        {low ? <Status kind="warn">Below the minimum</Status> : <Status kind="ok">Covers the worst case</Status>}
        <div className="mt-1 flex items-center gap-1.5 text-ink-2">{slashes ? <StatusIcon kind="slashed" /> : null}{slashes} slash{slashes === 1 ? "" : "es"} on record</div>
        <div className="text-ink-2">{low ? "No new tasks until the button tops it up" : "Earned in from task fees"}</div>
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
      <div className="mb-2 flex items-baseline justify-between"><h2 className="text-lg">Lease paid</h2><span className="num">{paid.toFixed(2)} of {m.leaseTotal}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full border border-rule bg-paper"><motion.div className="h-full bg-ink" animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 80, damping: 20 }} /></div>
      <div className="mt-2 text-[15px] text-ink-2">{m.owned ? "Title transferred. The machine belongs to the operator." : "Instalments are taken from every fee by rule."}</div>
    </div>
  );
}

export function BalanceSheet({ m, series }: { m?: MachineState; series: number[] }) {
  const max = Math.max(1, ...series);
  return (
    <div>
      <div className="flex items-end justify-between">
        <div><div className="label">Operating balance</div><div className="kpi">{(m?.balance ?? 0).toFixed(2)}</div></div>
        <div className="text-right text-[13px] text-ink-2">reserve rule {m?.reserve ?? 0}<br />{m?.tasksDone ?? 0} tasks done</div>
      </div>
      <svg viewBox="0 0 120 32" className="mt-2 h-8 w-full" role="img" aria-label="Balance over the run">
        {series.map((v, i) => <rect key={i} x={(i / Math.max(series.length, 1)) * 120} y={32 - (v / max) * 30} width={Math.max(1, 120 / Math.max(series.length, 1) - 1)} height={(v / max) * 30} rx="1" fill="#1F1A17" opacity={0.25 + 0.75 * (i / Math.max(series.length, 1))} />)}
      </svg>
    </div>
  );
}

export function JobList({ jobs }: { jobs: Record<string, Job> }) {
  const label: Record<Job["status"], string> = { posted: "Posted", locked: "Fee locked", running: "Running", confirmed: "Confirmed", released: "Released", held: "Held", declined: "Declined" };
  const list = Object.values(jobs);
  if (!list.length) return <div className="text-ink-2">No jobs yet.</div>;
  return (
    <ul className="flex flex-col gap-2">
      {list.map((j) => (
        <li key={j.id} className="flex items-start justify-between gap-3 border-b border-rule py-2.5 last:border-b-0">
          <div><div className="font-medium">{j.title}</div><div className="text-[13px] text-ink-2">{j.requester}, {j.window}{j.split ? `, split owner ${j.split.owner} instalment ${j.split.instalment} rail ${j.split.rail} bond ${j.split.bond}` : ""}</div></div>
          <div className="flex shrink-0 flex-col items-end gap-1"><span className="num font-semibold">{j.fee}</span>{j.status === "released" ? <Status kind="ok">{label[j.status]}</Status> : j.status === "held" || j.status === "declined" ? <Status kind="warn">{label[j.status]}</Status> : <span className="text-[13px] text-ink-2">{label[j.status]}</span>}</div>
        </li>
      ))}
    </ul>
  );
}

export function Narration({ lines }: { lines: string[] }) {
  const last = lines[lines.length - 1];
  return (
    <AnimatePresence mode="wait">
      <motion.p key={last ?? "none"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="leading-relaxed text-ink">
        {last ?? "Press start. Each step is narrated as the agents act."}
      </motion.p>
    </AnimatePresence>
  );
}

export function ButtonRing({ b }: { b?: { waiting: boolean; what: string } }) {
  if (!b) return null;
  return (
    <div className="flex items-center gap-3">
      <span className={`relative inline-block h-9 w-9 shrink-0 rounded-full border-2 ${b.waiting ? "border-warn bg-surface" : "border-ink bg-ink"}`} aria-hidden />
      <div className="text-[15px]">{b.waiting ? <Status kind="warn">Waiting for the operator&apos;s button</Status> : <div className="font-semibold">Button pressed</div>}<div className="text-ink-2">{b.what}</div></div>
    </div>
  );
}
