"use client";
import { demoHeaders } from "./demoToken";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Intent, MachineState, PolicyDecision, Job, Side } from "@/engine/types";
import { DEFAULT_POLICY, DEMO, short } from "@/engine/policy";
import { ADDR } from "@/engine/keys";
import { ruleLabel } from "@/engine/i18n";
import type { Gate, Understood, MessageEv, PlanItem, PlanMeta, Solvency, Telemetry, Proof, LooseEvent, TxView, LogEv, MachineView } from "./useRun";
import { timeOf, yuan } from "./money";
import { useLang } from "@/i18n/LangProvider";

const inbound = new Set(["fee_in", "top_up", "bounty", "release"]);
const danger = new Set(["slash", "refund"]);
const statusDot: Record<string, string> = { pending: "bg-muted pulse-dot", confirmed: "bg-gold-soft", finalised: "bg-gold" };

// One line per transaction: what, why, how much. Hash, block and timings open on click.
export function ChainFeed({ txs, compact = false }: { txs: TxView[]; compact?: boolean }) {
  const { d, t } = useLang();
  const [open, setOpen] = useState<string | null>(null);
  const P = d.panels;
  return (
    <div className="flex flex-col gap-1">
      <AnimatePresence initial={false}>
        {txs.slice(0, compact ? 6 : 40).map((tx) => {
          const status = tx.status ?? (tx.simulated ? "confirmed" : "pending");
          const isOpen = open === tx.hash;
          return (
            <motion.div key={tx.hash} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`mined rounded-lg border-l-2 px-3 py-1.5 ${danger.has(tx.kind) ? "border-l-red bg-red-soft/40" : inbound.has(tx.kind) ? "border-l-gold bg-paper-2/60" : "border-l-slate/60 bg-paper-2/60"}`}>
              <button type="button" onClick={() => setOpen(isOpen ? null : tx.hash)} aria-expanded={isOpen} className="flex w-full items-center gap-2 text-left">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[status]}`} title={P.txStatus[status]} />
                <span className="shrink-0 text-sm font-medium">{(P.kinds as Record<string, string>)[tx.kind] ?? tx.kind}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">{tx.label}</span>
                <span className={`shrink-0 text-sm tabular-nums ${danger.has(tx.kind) ? "text-red" : inbound.has(tx.kind) ? "text-red-deep" : "text-slate"}`}>{tx.kind === "title" ? P.titleWord : `${inbound.has(tx.kind) ? "+" : "-"}${yuan(tx.amount)}`}</span>
              </button>
              {isOpen ? (
                <div className="mono mt-1 flex flex-wrap gap-x-3 text-[10px] text-muted">
                  {tx.explorer && !tx.simulated ? <a className="underline decoration-gold hover:text-red-deep" href={tx.explorer} target="_blank" rel="noreferrer">{t("panels.onExplorer", { hash: short(tx.hash) })}</a> : <span title={tx.hash}>{short(tx.hash)}</span>}
                  <span>{t("panels.block", { n: tx.block })}{tx.simulated ? P.sim : ""}</span>
                  <span>{P.txStatus[status]}</span>
                  <span>{t("panels.sent", { t: timeOf(tx.seenAt) })}</span>
                  {status === "finalised" ? <span className="text-gold-deep">{t("panels.finalisedAt", { t: timeOf(tx.finalisedAt) })}</span> : null}
                </div>
              ) : null}
            </motion.div>
          );
        })}
      </AnimatePresence>
      {txs.length === 0 ? <div className="text-sm text-muted">{P.noTx}</div> : null}
    </div>
  );
}

// Gate strip under an untrusted message: what the gate decided before the agent read it.
export function gateTone(action?: string) {
  return action === "pass" ? "bg-gold text-ink" : action === "refuse" ? "bg-red text-white" : action === "redact" || action === "hold" ? "bg-[#e8a317] text-ink" : "bg-paper-2 text-muted";
}

function GateStrip({ g }: { g: Gate }) {
  const [open, setOpen] = useState(false);
  const { d } = useLang();
  const P = d.panels;
  return (
    <div className="mt-1.5 border-t border-line/70 pt-1.5 text-[11px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted">{P.gate}</span>
        <span className={`pill !px-1.5 !py-0.5 !text-[9px] ${gateTone(g.action)}`}>{g.action ? (P.gateActions as Record<string, string>)[g.action] ?? g.action : P.pending}</span>
        {(g.categories ?? []).map((c) => <span key={c} className="rounded-sm bg-paper-2 px-1.5 py-0.5 text-ink-2">{c}</span>)}
        {g.reason ? <span className="text-muted">{g.reason}</span> : null}
        {g.framed ? <button type="button" onClick={() => setOpen(!open)} className="ml-auto underline decoration-gold text-ink-2">{open ? P.hide : P.how}</button> : null}
      </div>
      {open && g.framed ? <pre className="mono mt-1.5 whitespace-pre-wrap break-all rounded-sm bg-ink p-2 text-[10px] text-white/85">{(g.preamble ? g.preamble + "\n" : "") + g.framed}</pre> : null}
    </div>
  );
}

function UnderstoodLine({ u }: { u: Understood }) {
  const { d, t } = useLang();
  const P = d.panels;
  const by = u.by ?? u.source ?? "rules";
  const addr = u.hadAddress ?? u.addressInText;
  return (
    <div className="mt-1.5 border-t border-line/70 pt-1.5 text-[11px] text-ink-2">
      <span className="font-semibold text-ink">{P.understood}</span> {u.task ?? P.task}{u.window ? `, ${u.window}` : ""}{u.fee !== undefined ? t("panels.fee", { fee: u.fee }) : ""}{u.geofence ? t("panels.geofence", { g: u.geofence }) : ""}
      <span className="ml-1.5 rounded-sm bg-paper-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">{t("panels.by", { who: by === "model" ? P.model : P.rules })}</span>
      {u.payeeName === null && addr ? <span className="ml-1.5 rounded-sm bg-red-soft px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-red">{P.addrIgnored}</span> : null}
    </div>
  );
}

// The four facts a judge reads first. The rest sit behind a link; every label is a human word.
const FACT_FIRST = ["fee", "instalment", "margin", "reserveRule"];
function Facts({ m }: { m: MessageEv }) {
  const { d, t } = useLang();
  const [more, setMore] = useState(false);
  const P = d.panels;
  const labels = P.factLabels as Record<string, string>;
  const all = Object.entries(m.facts ?? {});
  if (!all.length && m.grounded === undefined) return null;
  const first = all.filter(([k]) => FACT_FIRST.includes(k)).slice(0, 4);
  const shown = more ? all : first.length ? first : all.slice(0, 4);
  const rest = all.length - shown.length;
  const val = (v: string | number | boolean) => (typeof v === "boolean" ? (v ? d.judge.yes : d.judge.no) : String(v));
  return (
    <div className="mt-1.5 border-t border-white/15 pt-1.5 text-[11px]">
      <div className="flex flex-wrap items-center gap-1">
        {shown.map(([k, v]) => <span key={k} className="rounded-sm bg-white/12 px-1.5 py-0.5 text-white/90"><span className="text-white/60">{labels[k] ?? k}</span> {val(v)}</span>)}
        {rest > 0 || more ? <button type="button" onClick={() => setMore(!more)} className="text-white/60 underline decoration-gold">{more ? P.factsLess : t("panels.factsMore", { n: rest })}</button> : null}
      </div>
      <div className="mt-1 flex items-center gap-2 text-white/60">
        <span>{t("panels.factsFrom", { src: m.source === "model" ? P.model : P.template })}</span>
        {m.grounded === false ? <span className="rounded-sm bg-red px-1.5 py-0.5 text-[10px] uppercase text-white">{P.rejected}</span> : <span className="text-gold" aria-label={P.grounded}>&#10003; {P.grounded}</span>}
      </div>
    </div>
  );
}

export function AgentFeed({ messages, gates = {}, understood = {}, frozen = false }: { messages: MessageEv[]; gates?: Record<number, Gate>; understood?: Record<string, Understood>; frozen?: boolean }) {
  const { d, t } = useLang();
  const P = d.panels;
  const who = P.who as Record<string, string>;
  const roles = P.roles as Record<string, string>;
  const roleOf = (a: string) => roles[a === "requester" ? "farmer" : a === "operator" ? "pilot" : a] ?? a;
  const lastReq = messages.map((m, i) => (m.from === "requester" ? i : -1)).filter((i) => i >= 0).pop();
  const u = understood.last;
  // The log delivers one intent to every party of the job. Show it once, with who received it.
  const groups: { m: MessageEv; i: number; to: string[] }[] = [];
  messages.forEach((m, i) => {
    const g = groups[groups.length - 1];
    if (g && g.m.from === m.from && g.m.text === m.text) { if (!g.to.includes(m.to)) g.to.push(m.to); return; }
    groups.push({ m, i, to: [m.to] });
  });
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {groups.map(({ m, i, to }) => (
          <motion.div key={`${m.at}-${i}`} initial={{ opacity: 0, x: m.from === "machine" ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} className={`max-w-[94%] rounded-2xl px-3 py-2 text-sm ${m.from === "machine" ? "self-end bg-ink text-white" : "self-start bg-paper-2"}`}>
            <div className={`mb-0.5 flex items-center gap-2 text-[11px] ${m.from === "machine" ? "text-gold-soft" : "text-muted"}`}>
              <span>{who[m.from] ?? m.from}{m.untrusted ? P.untrusted : ""}{to.length > 1 ? t("panels.toMany", { who: to.map(roleOf).join(", ") }) : ""}</span>
              {m.from === "machine" && frozen ? <span className="rounded-sm bg-red px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">{P.frozen}</span> : null}
            </div>
            {m.text}
            {m.untrusted && gates[i] ? <GateStrip g={gates[i]} /> : null}
            {i === lastReq && u ? <UnderstoodLine u={{ ...u, hadAddress: u.hadAddress ?? /0x[a-fA-F0-9]{40}/.test(m.text) }} /> : null}
            {m.from === "machine" ? <Facts m={m} /> : null}
          </motion.div>
        ))}
      </AnimatePresence>
      {messages.length === 0 ? <div className="text-sm text-muted">{P.noMessages}</div> : null}
    </div>
  );
}

function Chip({ k, v }: { k: string; v: unknown }) {
  if (v === undefined || v === null || v === "") return null;
  return <span className="rounded-sm bg-paper-2 px-1.5 py-0.5 text-[11px]"><span className="text-muted">{k}</span> <span className="mono text-ink">{String(v)}</span></span>;
}

function Verdict({ v }: { v: PolicyDecision["verdict"] }) {
  const { d } = useLang();
  const cls = v === "allow" ? "text-gold-deep" : v === "deny" ? "text-red" : "text-slate";
  return <span className={`text-sm font-semibold ${cls}`}>{d.panels.verdict[v] ?? v}</span>;
}

// Last five decisions, one line each. Failed rules always show. The newest decision's full
// check list and its signed intent open on demand.
export function PolicyCard({ decisions, intents }: { decisions: PolicyDecision[]; intents: Intent[] }) {
  const { d, t, lang } = useLang();
  const [checks, setChecks] = useState(false);
  const [signed, setSigned] = useState(false);
  const P = d.panels;
  if (!decisions.length) return <div className="text-sm text-muted">{P.noDecision}</div>;
  const byId = new Map(intents.map((i) => [i.id, i as Intent & { nonce?: number; signer?: string }]));
  return (
    <div className="flex flex-col gap-1.5">
      {decisions.slice(0, 5).map((dec, n) => {
        const it = byId.get(dec.intentId);
        const signer = (dec as PolicyDecision & { signer?: string }).signer ?? it?.signer;
        const failed = dec.lines.filter((l) => !l.ok);
        const lines = n === 0 && checks ? dec.lines : failed;
        return (
          <motion.div key={dec.intentId + n} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={`rounded-lg border px-3 py-1.5 ${dec.verdict === "deny" ? "border-l-4 border-l-red border-line" : "border-line"} ${n > 0 ? "opacity-80" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="mono min-w-0 truncate text-xs text-ink-2">{dec.intentId}{it ? ` ${it.kind}` : ""}</span>
              <span className="flex shrink-0 items-center gap-2"><span className="text-[11px] text-muted">{failed.length ? t("panels.failedOf", { f: failed.length, n: dec.lines.length }) : t("panels.allPass", { n: dec.lines.length })}</span><Verdict v={dec.verdict} /></span>
            </div>
            {lines.length ? (
              <ul className="mt-1 flex flex-col gap-0.5">
                {lines.map((l) => (
                  <li key={l.rule} className="flex items-start gap-2 text-xs">
                    <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${l.ok ? "bg-gold" : "bg-red"}`} aria-hidden />
                    <span><span className="font-medium">{ruleLabel(lang, l.rule)}</span> <span className="text-muted">{lang === "zh" ? l.detailZh ?? l.detail : l.detail}</span></span>
                  </li>
                ))}
              </ul>
            ) : null}
            {n === 0 ? (
              <div className="mt-1 flex gap-3 text-[11px] text-ink-2">
                <button type="button" onClick={() => setChecks(!checks)} className="underline decoration-gold">{checks ? P.hideChecks : t("panels.showChecks", { n: dec.lines.length })}</button>
                {it ? <button type="button" onClick={() => setSigned(!signed)} className="underline decoration-gold">{signed ? P.hideSigned : P.showSigned}</button> : null}
              </div>
            ) : null}
            {n === 0 && signed && it ? (
              <div className="mt-1.5">
                <div className="flex flex-wrap gap-1">
                  <Chip k="actor" v={it.actor} /><Chip k="kind" v={it.kind} /><Chip k="payee" v={it.payee ? short(it.payee) : undefined} /><Chip k="amount" v={it.amount} /><Chip k="jobId" v={it.jobId} /><Chip k="geofence" v={it.geofence} /><Chip k="confirmed" v={it.confirmed} /><Chip k="nonce" v={it.nonce} />
                </div>
                {signer ? <div className="mono mt-1 text-[10px] text-muted">{t("panels.signer", { s: short(signer) })}</div> : null}
                <div className="mono mt-0.5 break-all text-[10px] text-muted">{P.sig} {it.signature}</div>
              </div>
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );
}

// Known addresses to a role word: the demo keys first, then the allowlist. Anything else stays a short hash.
const ROLE_OF: Record<string, string> = Object.fromEntries([
  ...Object.entries(ADDR).map(([k, a]) => [a.toLowerCase(), k === "requester" ? "farmer" : k === "operator" ? "pilot" : k]),
  ...Object.entries(DEFAULT_POLICY.allowlist).map(([k, a]) => [a.toLowerCase(), k === "requester" ? "farmer" : k]),
]);

// A receipt for a slash. Every fact is read from the signed intent and the contracts' records.
export function ProofCard({ proof, log }: { proof?: Proof; log?: LogEv }) {
  const { d, t, lang } = useLang();
  const [addrs, setAddrs] = useState(false);
  const P = d.panels;
  if (!proof) return <div className="text-sm text-muted">{P.proofNone}</div>;
  const roles = P.roles as Record<string, string>;
  const role = (a?: string) => (a && roles[ROLE_OF[a.toLowerCase()] ?? ""]) || short(a);
  const bondKind = (proof.bond ?? proof.bondKind) === "pilot" ? "pilot" : "vendor";
  const bond = bondKind === "pilot" ? d.moments.pilot : d.moments.vendor;
  const shadow = proof.shadow === true;
  const treasury = typeof proof.treasury === "number" ? proof.treasury : undefined;
  const paid = proof.paidTo?.length ? proof.paidTo.join(P.and)
    : shadow ? t("panels.paidShadow", { who: short(proof.submitterAddr ?? proof.submitter), tr: treasury !== undefined ? t("panels.paidShadowTr", { bounty: yuan(proof.bounty), treasury: yuan(treasury) }) : "" })
    : treasury !== undefined && treasury === proof.slash ? t("panels.paidTreasuryOnly", { treasury: yuan(treasury) })
    : treasury !== undefined ? t("panels.paidTreasury", { harmed: yuan((proof.slash ?? 0) - treasury), treasury: yuan(treasury) }) : P.paidNone;
  const hash = proof.intentHash ?? proof.intentId;
  const parties = log?.parties ?? [];
  const ledger: [string, string][] = [
    [P.receiptIntent, `${short(hash)}${log ? P.inLog : ""}`],
    [P.receiptDelivered, parties.length ? parties.map(role).join(", ") : P.unknown],
    [P.receiptSigner, `${short(proof.signer)}, ${role(proof.signer)}`],
    [P.receiptOutcome, paid],
  ];
  const full: [string, string | undefined][] = [[P.receiptIntent, hash], ...parties.map((a): [string, string] => [role(a), a]), [P.receiptSigner, proof.signer]];
  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2">
        <span className="font-semibold">{proof.rule ? ruleLabel(lang, proof.rule) : P.unknown}</span>
        <span className={`pill !px-1.5 !py-0.5 !text-[9px] ${bondKind === "pilot" ? "bg-gold-soft text-ink" : "bg-gold text-ink"}`}>{t("panels.bondChip", { bond })}</span>
        <span className="kpi ml-auto !text-xl tabular-nums text-red">-{yuan(proof.slash)}</span>
      </div>
      <dl className="mt-2 flex flex-col gap-1">
        {ledger.map(([k, v], i) => (
          <motion.div key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.3 }} className="grid grid-cols-[6rem_1fr] gap-2">
            <dt className="text-muted">{k}</dt><dd className={i === 3 ? "font-semibold text-red" : "text-ink-2"}>{v}</dd>
          </motion.div>
        ))}
      </dl>
      <button type="button" onClick={() => setAddrs(!addrs)} className="mt-2 text-xs text-ink-2 underline decoration-gold">{addrs ? P.hideAddr : P.showAddr}</button>
      {addrs ? <ul className="mono mt-1 flex flex-col gap-0.5 break-all text-[10px] text-muted">{full.filter(([, a]) => a).map(([k, a]) => <li key={k + a}><span className="text-ink-2">{k}</span> {a}</li>)}</ul> : null}
      <p className="mt-3 border-t border-line pt-2 text-xs text-muted">{bondKind === "vendor" ? P.noteVendor : P.notePilot}{P.noteLive}</p>
    </div>
  );
}

export function BondGauge({ value, min, slashes, side, solvency }: { value: number; min: number; slashes: number; side?: Side; solvency?: Solvency }) {
  const { d, t } = useLang();
  const P = d.panels;
  const max = Math.max(min * 1.6, value, 1);
  const r = 44, c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  const minPct = Math.min(1, min / max);
  const low = value < min;
  const sub = solvency ? (solvency.covers ? t("panels.worstCovered", { w: yuan(solvency.worst) }) : P.smallJobs) : low ? P.reachMin : P.coversWorst;
  return (
    <div className="flex items-center gap-4">
      <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={t("panels.gaugeAria", { v: yuan(value), min: yuan(min) })}>
        <circle cx="56" cy="56" r={r} fill="none" stroke="#efe9d8" strokeWidth="10" />
        <circle cx="56" cy="56" r={r} fill="none" stroke={low ? "#c8102e" : "#b8860b"} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${pct * c} ${c}`} transform="rotate(-90 56 56)" style={{ transition: "stroke-dasharray 600ms ease, stroke 300ms" }} />
        <line x1="56" y1="4" x2="56" y2="16" stroke="#1b2a2a" strokeWidth="2" transform={`rotate(${minPct * 360} 56 56)`} />
        <text x="56" y="52" textAnchor="middle" fontSize="16" fontWeight="600" fill="#1b2a2a">{yuan(value)}</text>
        <text x="56" y="68" textAnchor="middle" fontSize="10" fill="#7f8d8e">{t("panels.gaugeMin", { min: yuan(min) })}</text>
      </svg>
      <div className="text-sm">
        <div className="font-medium">{side === "neighbour" ? P.bond : P.pilotBond}{low ? P.under : ""}</div>
        <div className={solvency?.covers ? "text-gold-deep" : "text-muted"}>{sub}</div>
        <div className="text-xs text-muted" title={P.slice}>{t(slashes === 1 ? "panels.slashOne" : "panels.slashMany", { n: slashes })}</div>
      </div>
    </div>
  );
}

// The vendor's own money, posted up front. Slashed for the agent's mistakes, never the pilot's.
export function VendorBond({ m }: { m?: MachineView }) {
  const { d, t } = useLang();
  const P = d.panels;
  const v = m?.vendorBond, min = m?.vendorBondMin;
  return (
    <div className="text-sm">
      <div className="flex items-end justify-between"><span className="font-medium">{P.vendorTitle}</span><span className="kpi tabular-nums">{v === undefined ? d.run.na : yuan(v)}</span></div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-paper-2"><div className="h-full bg-gold" style={{ width: `${min ? Math.min(100, ((v ?? 0) / min) * 100) : v ? 100 : 0}%` }} /></div>
      <div className="mt-1 text-xs text-muted">{t("panels.vendorShort", { p: yuan(m?.vendorPenalty ?? DEMO.vendorPenalty), cap: yuan(m?.vendorDailyCap ?? DEMO.vendorDailyCap) })}</div>
    </div>
  );
}

export function LeaseBar({ m }: { m?: MachineState }) {
  const { d, t } = useLang();
  const P = d.panels;
  if (!m) return null;
  const paid = m.leaseTotal - m.leaseBalance;
  const pct = Math.min(100, (paid / m.leaseTotal) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span>{P.leasePaid}</span><span className="tabular-nums">{t("panels.leaseOf", { paid: yuan(paid), total: yuan(m.leaseTotal) })}</span></div>
      <div className="h-3 overflow-hidden rounded-full bg-paper-2"><motion.div className={`h-full ${m.owned ? "bg-gold" : "bg-slate"}`} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 80, damping: 20 }} /></div>
      <div className="mt-1 text-xs text-muted">{m.owned ? P.leaseOwned : P.leaseRule}</div>
    </div>
  );
}

export function BalanceSheet({ m, series }: { m?: MachineState; series: number[] }) {
  const { d, t } = useLang();
  const P = d.panels;
  const max = Math.max(1, ...series);
  return (
    <div>
      <div className="flex items-end justify-between">
        <div><div className="text-xs text-muted">{P.balanceTitle}</div><div className="kpi tabular-nums">{yuan(m?.balance)}</div></div>
        <div className="text-right text-xs text-muted">{t("panels.reserve", { r: yuan(m?.reserve) })}<br />{t("panels.tasksDone", { n: m?.tasksDone ?? 0 })}</div>
      </div>
      <svg viewBox="0 0 120 32" className="mt-2 h-8 w-full" role="img" aria-label={P.balanceAria}>
        {series.map((v, i) => <rect key={i} x={(i / Math.max(series.length, 1)) * 120} y={32 - (v / max) * 30} width={Math.max(1, 120 / Math.max(series.length, 1) - 1)} height={(v / max) * 30} rx="1" fill="#b8860b" opacity={0.35 + 0.65 * (i / Math.max(series.length, 1))} />)}
      </svg>
    </div>
  );
}

// The day's work ranked by margin per mu. Declined rows stay visible with the reason.
export function PlanTable({ plan, jobs = {} }: { plan?: PlanItem[]; jobs?: Record<string, Job> }) {
  const { d } = useLang();
  const P = d.panels;
  if (!plan?.length) return null;
  return (
    <div className="mb-3">
      <div className="mb-1 text-xs text-muted">{P.planTitle}</div>
      <table className="passbook w-full text-xs">
        <thead><tr><th className="text-left">#</th><th className="text-left">{P.thJob}</th><th className="text-right">{P.thFee}</th><th className="text-right">{P.thMargin}</th><th className="pl-3 text-left">{P.thStatus}</th></tr></thead>
        <tbody>
          {plan.map((p, i) => {
            const declined = p.declined ?? (p.accepted !== undefined ? !p.accepted : p.clears === false || p.order === null);
            const job = p.jobId ? jobs[p.jobId] : undefined;
            return (
              <tr key={p.jobId ?? i} className={declined ? "text-muted" : ""}>
                <td>{declined ? "-" : (p.order ?? p.rank ?? i + 1)}</td><td className={declined ? "line-through decoration-red/60" : "text-ink"}>{p.title ?? p.jobId}</td><td className="text-right tabular-nums">{p.fee === undefined ? "" : yuan(p.fee)}</td><td className="text-right tabular-nums">{yuan(p.marginPerMu ?? p.margin ?? 0, 2)}</td>
                <td className="pl-3">{declined ? <span title={p.reason}><span className="pill !px-1.5 !py-0.5 !text-[9px] bg-red-soft text-red">{P.declined}</span> <span className="text-[11px]">{p.reason ?? ""}</span></span> : job ? <span className={`pill !px-1.5 !py-0.5 !text-[9px] ${jobTone[job.status]}`}>{P.jobStatus[job.status] ?? job.status}</span> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const jobTone: Record<Job["status"], string> = { posted: "bg-paper-2", locked: "bg-paper-2 text-slate", running: "bg-gold-soft text-red-deep", confirmed: "bg-gold-soft text-red-deep", released: "bg-gold text-ink", held: "bg-red/15 text-red", declined: "bg-paper-2 text-muted" };

// Plausibility: area the track supports against the area claimed.
export function TelemetryCard({ t: tele }: { t?: Telemetry }) {
  const { d, t } = useLang();
  const P = d.panels;
  if (!tele) return <div className="text-sm text-muted">{P.teleNone}</div>;
  const supported = tele.areaSupported ?? 0, claimed = tele.areaClaimed ?? 0;
  const ratio = tele.ratio ?? (supported > 0 ? claimed / supported : 0);
  const held = tele.held ?? (tele.ok === false);
  const pct = Math.min(100, (supported / Math.max(claimed, supported, 1e-9)) * 100);
  const track = tele.trackM ?? tele.track;
  return (
    <div className="text-sm">
      <div className="mb-2 flex items-center justify-between"><span className="font-medium">{P.teleTitle}</span><span className={`pill ${held ? "bg-red text-white" : "bg-gold text-ink"}`}>{held ? P.held : P.ok}</span></div>
      <div className="text-xs text-muted">{t("panels.teleLine", { track: track ?? "?", swath: tele.swath ?? "?", s: tele.seconds ?? "?" })}</div>
      <div className="mt-2 flex justify-between text-xs"><span>{P.supported} <b className="tabular-nums">{supported}</b> {P.mu}</span><span>{P.claimed} <b className="tabular-nums">{claimed}</b> {P.mu}</span></div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-red/15"><div className={`h-full ${held ? "bg-red" : "bg-gold"}`} style={{ width: `${pct}%` }} /></div>
      <div className="mt-1 text-xs text-muted">{held ? t("panels.teleHeld", { r: ratio.toFixed(1) }) : t("panels.teleOk", { r: ratio.toFixed(2) })}</div>
      {held && tele.reasons?.length ? <ul className="mt-2 flex flex-wrap gap-1" title={typeof tele.z === "number" ? `${P.zLabel} ${tele.z.toFixed(2)}` : undefined}>{tele.reasons.map((r) => <li key={r} className="pill !px-1.5 !py-0.5 !text-[9px] bg-red-soft text-red">{r}</li>)}</ul> : null}
    </div>
  );
}

// The knapsack result: budget against used mu, charges, the jobs taken and the jobs left, expected margin.
export function PlanCard({ plan, meta }: { plan?: PlanItem[]; meta?: PlanMeta }) {
  const { d, t } = useLang();
  const P = d.panels;
  if (!plan?.length && !meta) return <div><h2 className="mb-3 text-sm font-semibold">{P.planCard}</h2><div className="text-sm text-muted">{P.planNone}</div></div>;
  const isDeclined = (p: PlanItem) => p.declined ?? (p.accepted !== undefined ? !p.accepted : p.clears === false || p.order === null);
  const taken = (plan ?? []).filter((p) => !isDeclined(p)).sort((a, b) => (a.order ?? a.rank ?? 0) - (b.order ?? b.rank ?? 0));
  // budgetMu is per charge; the day's capacity is that times the charges.
  const budget = meta?.budgetMu !== undefined ? meta.budgetMu * (meta.charges ?? 1) : undefined, used = meta?.usedMu;
  const fill = budget ? Math.min(100, ((used ?? 0) / budget) * 100) : 0;
  const total = meta?.totalMargin ?? taken.reduce((a, p) => a + (p.margin ?? 0), 0);
  return (
    <div className="text-sm">
      <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">{P.planCard}</h2>{meta?.method ? <span className="pill bg-paper-2 text-muted">{meta.method}</span> : null}</div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="tile !p-2"><div className="text-muted">{P.totalMargin}</div><div className="tech text-base font-bold text-gold-deep">{yuan(total, 2)}</div></div>
        <div className="tile !p-2"><div className="text-muted">{P.planTakenLabel}</div><div className="tabular-nums">{t("panels.planTaken", { a: taken.length, b: (plan ?? []).length })}</div></div>
        <div className="tile !p-2"><div className="text-muted">{P.usedMu}</div><div className="tabular-nums">{used ?? "?"} / {budget ?? "?"} {P.mu}</div>{budget ? <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2"><div className="h-full bg-gold" style={{ width: `${fill}%` }} /></div> : null}</div>
        <div className="tile !p-2"><div className="text-muted">{P.charges}</div><div className="tabular-nums">{meta?.charges ?? "?"}</div></div>
      </div>
    </div>
  );
}

export function JobList({ jobs, hold = 20 }: { jobs: Record<string, Job>; hold?: number }) {
  const { d, t } = useLang();
  const P = d.panels;
  const tone: Record<Job["status"], string> = { posted: "bg-paper-2", locked: "bg-paper-2 text-slate", running: "bg-gold-soft text-red-deep", confirmed: "bg-gold-soft text-red-deep", released: "bg-gold text-ink", held: "bg-red/15 text-red", declined: "bg-paper-2 text-muted" };
  const list = Object.values(jobs);
  if (!list.length) return <div className="text-sm text-muted">{P.noJobs}</div>;
  const names = d.names as Record<string, string>;
  return (
    <ul className="flex flex-col gap-2">
      {list.map((j) => (
        <li key={j.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm">
          <div className="min-w-0"><div className="font-medium">{j.title}</div><div className="text-xs text-muted">{names[j.requester] ?? j.requester}, {j.window}{j.split ? t("panels.split", { o: yuan(j.split.owner), i: yuan(j.split.instalment), r: yuan(j.split.rail), b: yuan(j.split.bond) }) : ""}</div>
            {j.status === "released" ? <span className="mt-1 inline-block rounded-sm bg-gold-soft px-1.5 py-0.5 text-[10px] text-ink-2">{t("panels.holdLine", { h: yuan(Math.min(hold, j.fee)) })}</span> : null}</div>
          <div className="flex items-center gap-2"><span className="tabular-nums">{yuan(j.fee)}</span><span className={`pill ${tone[j.status]}`}>{P.jobStatus[j.status] ?? j.status}</span></div>
        </li>
      ))}
    </ul>
  );
}

// The scene caption. A pinned moment stays in front; the engine's latest line runs under it.
export function Narration({ lines, pinned }: { lines: string[]; pinned?: string }) {
  const { d } = useLang();
  const last = lines[lines.length - 1];
  return (
    <div aria-live="polite">
      {pinned ? (
        <AnimatePresence mode="wait"><motion.p key={pinned} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-base font-semibold leading-snug text-ink">{pinned}</motion.p></AnimatePresence>
      ) : null}
      <AnimatePresence mode="wait">
        <motion.p key={last ?? "none"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`leading-relaxed text-ink-2 ${pinned ? "mt-1 text-xs" : "text-sm"}`}>
          {last ?? d.panels.narrationIdle}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// The top permission tier. While waiting, the judge presses it; the events come back from the API.
export function ButtonRing({ b, scenario, onEvents }: { b?: { waiting: boolean; what: string; signer?: string }; scenario: Side; onEvents?: (ev: LooseEvent[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { d, t, lang } = useLang();
  const P = d.panels;
  if (!b) return null;
  async function press() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/button", { method: "POST", headers: { "Content-Type": "application/json", ...demoHeaders() }, body: JSON.stringify({ what: b!.what, amount: 200, scenario, lang }) });
      if (!r.ok) throw new Error(`button returned ${r.status}`);
      const j = (await r.json()) as { events?: LooseEvent[] };
      onEvents?.(j.events ?? []);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="flex items-center gap-3">
      {b.waiting ? (
        <button type="button" onClick={press} disabled={busy} className="pulse relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-red text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_0_0_4px_#f6d9de] transition active:scale-95 disabled:opacity-60" aria-label={P.pressAria}>{busy ? "..." : P.press}</button>
      ) : <span className="relative inline-block h-10 w-10 rounded-full bg-gold" aria-hidden />}
      <div className="text-sm">
        <div className="font-medium">{b.waiting ? P.waitingButton : P.pressed}</div>
        <div className="text-muted">{b.what === "top_up" ? P.topUp : b.what}</div>
        <div className="text-xs text-muted">{P.opOnly}{!b.waiting && b.signer ? <span className="mono ml-1">{t("panels.signer", { s: short(b.signer) })}</span> : ""}</div>
        {err ? <div className="text-xs text-red">{err}</div> : null}
      </div>
    </div>
  );
}
