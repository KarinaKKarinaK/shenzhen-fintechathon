"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { ChainTx, Intent, MachineState, PolicyDecision, EngineEvent, Job } from "@/engine/types";
import { short } from "@/engine/policy";

const kindLabel: Record<ChainTx["kind"], string> = { fee_in: "Fee in", instalment: "Instalment", energy: "Rail fee", cover: "Cover", bond_fill: "Bond fill", slash: "Slash", bounty: "Bounty", title: "Title transfer", lock: "Fee locked", release: "Release", refund: "Held", top_up: "Top up" };
const inbound = new Set(["fee_in", "top_up", "bounty", "release"]);
const danger = new Set(["slash", "refund"]);

export function ChainFeed({ txs, compact = false }: { txs: ChainTx[]; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {txs.slice(0, compact ? 6 : 40).map((tx) => (
          <motion.div key={tx.hash} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`mined rounded-xl border px-3 py-2 ${danger.has(tx.kind) ? "border-rust/40 bg-rust/5" : inbound.has(tx.kind) ? "border-teal/40 bg-teal/5" : "border-indigo/40 bg-indigo/5"}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{kindLabel[tx.kind]}</span>
              <span className={`text-sm tabular-nums ${danger.has(tx.kind) ? "text-rust" : inbound.has(tx.kind) ? "text-teal-deep" : "text-indigo"}`}>{tx.kind === "title" ? "title" : `${inbound.has(tx.kind) ? "+" : "-"}${tx.amount}`}</span>
            </div>
            <div className="text-xs text-muted">{tx.label}</div>
            <div className="mono mt-1 flex items-center justify-between text-muted">
              {tx.explorer ? <a className="underline decoration-teal/50 hover:text-teal-deep" href={tx.explorer} target="_blank" rel="noreferrer">{short(tx.hash)}</a> : <span title={tx.hash}>{short(tx.hash)}</span>}
              <span>block {tx.block}{tx.simulated ? " sim" : ""}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {txs.length === 0 ? <div className="text-sm text-muted">No transactions yet. Start a run.</div> : null}
    </div>
  );
}

export function AgentFeed({ messages }: { messages: Extract<EngineEvent, { t: "agent.message" }>[] }) {
  const who: Record<string, string> = { machine: "Machine agent", requester: "Requester agent", lender: "Lender agent", hunter: "Hunter", operator: "Operator" };
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {messages.slice(-8).map((m, i) => (
          <motion.div key={`${m.at}-${i}`} initial={{ opacity: 0, x: m.from === "machine" ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${m.from === "machine" ? "self-end bg-ink text-paper" : "self-start border border-line bg-paper"}`}>
            <div className={`mb-0.5 text-[11px] ${m.from === "machine" ? "text-glow" : "text-muted"}`}>{who[m.from] ?? m.from}{m.untrusted ? " (untrusted data)" : ""}</div>
            {m.text}
          </motion.div>
        ))}
      </AnimatePresence>
      {messages.length === 0 ? <div className="text-sm text-muted">The agents have not spoken yet.</div> : null}
    </div>
  );
}

export function PolicyCard({ decision, intent }: { decision?: PolicyDecision; intent?: Intent }) {
  if (!decision) return <div className="text-sm text-muted">No decision yet. The policy engine checks every signed intent.</div>;
  const tone = decision.verdict === "allow" ? "text-teal-deep" : decision.verdict === "deny" ? "text-rust" : "text-indigo";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="mono text-muted">{decision.intentId}{intent ? ` ${intent.kind}` : ""}</span>
        <span className={`text-sm font-semibold ${tone}`}>{decision.verdict === "allow" ? "Allowed" : decision.verdict === "deny" ? "Blocked" : "Needs the button"}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {decision.lines.map((l, i) => (
          <motion.li key={l.rule} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }} className="flex items-start gap-2 text-sm">
            <span className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${l.ok ? "bg-teal" : "bg-rust"}`} aria-hidden />
            <span><span className="font-medium">{l.rule}</span> <span className="text-muted">{l.detail}</span></span>
          </motion.li>
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
        <circle cx="56" cy="56" r={r} fill="none" stroke="#d8d0bf" strokeWidth="10" />
        <circle cx="56" cy="56" r={r} fill="none" stroke={low ? "#c4502b" : "#119e9b"} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${pct * c} ${c}`} transform="rotate(-90 56 56)" style={{ transition: "stroke-dasharray 600ms ease, stroke 300ms" }} />
        <line x1="56" y1="4" x2="56" y2="16" stroke="#14302d" strokeWidth="2" transform={`rotate(${minPct * 360} 56 56)`} />
        <text x="56" y="52" textAnchor="middle" fontSize="20" fontWeight="600" fill="#14302d">{value.toFixed(0)}</text>
        <text x="56" y="68" textAnchor="middle" fontSize="10" fill="#7a8783">min {min}</text>
      </svg>
      <div className="text-sm">
        <div className="font-medium">{low ? "Below the minimum" : "Covers the worst case"}</div>
        <div className="text-muted">{slashes} slash{slashes === 1 ? "" : "es"} on record</div>
        <div className="text-muted">{low ? "No new tasks until the button tops it up" : "Earned in from task fees"}</div>
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
      <div className="h-3 overflow-hidden rounded-full bg-line"><motion.div className={`h-full ${m.owned ? "bg-teal" : "bg-indigo"}`} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 80, damping: 20 }} /></div>
      <div className="mt-1 text-xs text-muted">{m.owned ? "Title transferred. The machine belongs to the operator." : "Instalments are taken from every fee by rule."}</div>
    </div>
  );
}

export function BalanceSheet({ m, series }: { m?: MachineState; series: number[] }) {
  const max = Math.max(1, ...series);
  return (
    <div>
      <div className="flex items-end justify-between">
        <div><div className="text-xs text-muted">Operating balance</div><div className="serif text-4xl tabular-nums">{(m?.balance ?? 0).toFixed(2)}</div></div>
        <div className="text-right text-xs text-muted">reserve rule {m?.reserve ?? 0}<br />{m?.tasksDone ?? 0} tasks done</div>
      </div>
      <svg viewBox="0 0 120 32" className="mt-2 h-8 w-full" role="img" aria-label="Balance over the run">
        {series.map((v, i) => <rect key={i} x={(i / Math.max(series.length, 1)) * 120} y={32 - (v / max) * 30} width={Math.max(1, 120 / Math.max(series.length, 1) - 1)} height={(v / max) * 30} rx="1" fill="#119e9b" opacity={0.35 + 0.65 * (i / Math.max(series.length, 1))} />)}
      </svg>
    </div>
  );
}

export function JobList({ jobs }: { jobs: Record<string, Job> }) {
  const tone: Record<Job["status"], string> = { posted: "bg-line", locked: "bg-indigo/15 text-indigo", running: "bg-teal/15 text-teal-deep", confirmed: "bg-teal/15 text-teal-deep", released: "bg-teal text-white", held: "bg-rust/15 text-rust", declined: "bg-line text-muted" };
  const list = Object.values(jobs);
  if (!list.length) return <div className="text-sm text-muted">No jobs yet.</div>;
  return (
    <ul className="flex flex-col gap-2">
      {list.map((j) => (
        <li key={j.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm">
          <div><div className="font-medium">{j.title}</div><div className="text-xs text-muted">{j.requester}, {j.window}{j.split ? `, split owner ${j.split.owner} instalment ${j.split.instalment} rail ${j.split.rail} bond ${j.split.bond}` : ""}</div></div>
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
      <motion.p key={last ?? "none"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm leading-relaxed text-[#cfe3df]">
        {last ?? "Press start. The narration explains each step as the agents act."}
      </motion.p>
    </AnimatePresence>
  );
}

export function ButtonRing({ b }: { b?: { waiting: boolean; what: string } }) {
  if (!b) return null;
  return (
    <div className="flex items-center gap-3">
      <span className={`relative inline-block h-10 w-10 rounded-full ${b.waiting ? "pulse bg-teal/30" : "bg-teal"}`} aria-hidden />
      <div className="text-sm"><div className="font-medium">{b.waiting ? "Waiting for the operator's button" : "Button pressed"}</div><div className="text-muted">{b.what}</div></div>
    </div>
  );
}
