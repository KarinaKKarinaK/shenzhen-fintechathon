// Deterministic policy engine. Sits between every agent and its wallet.
// Rules are data. The model never sees this code and cannot change it.

import { keccak256, recoverMessageAddress } from "viem";
import { ADDR, canonical, isKeyed } from "./keys";
import type { Actor, Economics, Intent, Job, PolicyDecision, PolicyLine, Tier } from "./types";

export interface Policy {
  allowlist: Record<string, string>; // name -> address
  contacts: Record<string, string>; // display name -> allowlist name
  perTxCap: number;
  dailyCap: number;
  rateBand: [number, number]; // allowed instalment share of a fee
  maxPerHour: number;
  deviationPct: number;
  geofences: string[];
  coverRequired: boolean;
  earnInMaxFee: number; // a task this small may run while the bond is still filling
}

export const DEFAULT_POLICY: Policy = {
  allowlist: {
    lender: "0x5a1eC0ffee0000000000000000000000000000A1",
    requester: "0x7b2fC0ffee0000000000000000000000000000B2",
    charging: "0x9c3dC0ffee0000000000000000000000000000C3",
    coverpool: "0x2d4eC0ffee0000000000000000000000000000D4",
    bond: "0x4e5fC0ffee0000000000000000000000000000E5",
    rail: "0x6f60C0ffee0000000000000000000000000000F6",
    hunter: "0x8a7bC0ffee0000000000000000000000000000A7",
  },
  contacts: { "Farmer Lin": "requester", "Flat 4B": "requester" },
  perTxCap: 120,
  dailyCap: 600,
  rateBand: [0.2, 0.45],
  maxPerHour: 12,
  deviationPct: 25,
  geofences: ["flat-4b", "field-north", "route-nanshan-futian", "route-field-a"],
  coverRequired: true,
  earnInMaxFee: 150,
};

// Permission tiers as data, for the dashboard.
export const TIERS: { tier: Tier; name: string; rule: string; who: string }[] = [
  { tier: "L0", name: "Read", rule: "Read prices, balances, messages. Nothing moves.", who: "Any agent, the model" },
  { tier: "L1", name: "Draft", rule: "Write text and read messages into fields. Cannot name a payee or an amount.", who: "The model" },
  { tier: "L2", name: "Engine allow", rule: "Payments on the allowlist inside the caps, tasks inside the geofence with cover bound.", who: "Machine key through the policy engine" },
  { tier: "L3", name: "Operator key", rule: "Raise a cap, change the rate band, widen a geofence, top up the bond.", who: "The physical button only" },
];

export interface EvalContext {
  reference?: number;
  fee?: number;
  listing?: { feeMin: number; feeMax: number };
  requester?: string;
  eco?: Economics;
  job?: Job;
  bond?: { balance: number; min: number };
}

// Spend and rate state lives at module level so it survives across requests.
// A scope separates the live scenarios from shadow runs in the attack set.
const ledger = new Map<string, { day: string; spent: number; recent: number[] }>();
const spent = new Set<string>();

function book(scope: string, actor: Actor) {
  const key = `${scope}:${actor}`;
  const day = new Date().toISOString().slice(0, 10);
  let b = ledger.get(key);
  if (!b || b.day !== day) { b = { day, spent: 0, recent: [] }; ledger.set(key, b); }
  b.recent = b.recent.filter((t) => Date.now() - t < 3600_000);
  return b;
}

export class PolicyEngine {
  constructor(public policy: Policy = DEFAULT_POLICY, public scope = "default") {}

  static reset(scope: string) {
    for (const k of ledger.keys()) if (k.startsWith(`${scope}:`)) ledger.delete(k);
  }

  spentToday(actor: Actor = "machine") { return book(this.scope, actor).spent; }

  async evaluate(intent: Intent, ctx: EvalContext = {}): Promise<PolicyDecision> {
    const lines: PolicyLine[] = [];
    const L = (rule: string, ok: boolean, detail: string, tier: Tier = "L2") => lines.push({ rule, ok, detail, tier });
    const p = this.policy;
    const b = book(this.scope, intent.actor);

    // 1. Signature: the body must be signed by the key of the actor it names.
    let signer = "0x0000000000000000000000000000000000000000";
    try {
      signer = await recoverMessageAddress({ message: canonical(intent), signature: intent.signature as `0x${string}` });
    } catch { /* unparseable signature stays the zero address */ }
    const expected = isKeyed(intent.actor) ? ADDR[intent.actor] : null;
    const sigOk = !!expected && signer.toLowerCase() === expected.toLowerCase();
    L("signature", sigOk, sigOk ? `signed by ${short(signer)}, the ${intent.actor} key` : `signer ${short(signer)} is not the ${intent.actor} key ${short(expected ?? undefined)}`);

    // 2. Replay: each signature is accepted once, ever.
    const sigHash = keccak256(intent.signature as `0x${string}`);
    const replayed = spent.has(sigHash);
    spent.add(sigHash);
    L("replay", !replayed, replayed ? "this signature was already evaluated" : "fresh signature, nonce " + intent.nonce);

    const money = intent.kind === "pay" || intent.kind === "pay_instalment" || intent.kind === "top_up" || intent.kind === "set_cap" || intent.kind === "accept_job";
    const amt = intent.amount ?? 0;
    if (money) {
      const amountOk = Number.isFinite(amt) && amt > 0 && Math.abs(Math.round(amt * 100) - amt * 100) < 1e-6;
      L("amount", amountOk, amountOk ? `${amt} is a positive number with at most 2 decimals` : `${amt} is not a valid amount`);
    }

    // 3. Provenance: a payee or amount read out of a message is never used.
    const pv = intent.provenance;
    if (pv && (intent.kind === "pay" || intent.kind === "pay_instalment")) {
      const ok = pv.amount !== "message" && pv.payee !== "message";
      L("provenance", ok, ok ? `amount from ${pv.amount}, payee from ${pv.payee}` : `${pv.amount === "message" ? "amount" : "payee"} came from message text`);
    }

    if (intent.kind === "pay" || intent.kind === "pay_instalment") {
      const payee = intent.payee ?? "";
      const known = Object.values(p.allowlist).some((a) => a.toLowerCase() === payee.toLowerCase());
      L("allowlist", known, known ? `payee ${short(payee)} is on the allowlist` : `payee ${short(payee)} is not on the allowlist`);
      if (!known) {
        const near = Object.entries(p.allowlist).map(([name, a]) => ({ name, a, d: distance(a, payee) })).find((x) => x.d >= 1 && x.d <= 3);
        if (near) L("lookalike", false, `differs from ${near.name} ${short(near.a)} in ${near.d} character${near.d > 1 ? "s" : ""}`);
      }
      if (intent.kind === "pay_instalment") {
        const toLender = payee.toLowerCase() === p.allowlist.lender.toLowerCase();
        L("instalment payee", toLender, toLender ? "instalment goes to the lender" : "an instalment can only go to the lender");
      }
      L("per transaction cap", amt <= p.perTxCap, `${amt} against cap ${p.perTxCap}`);
      L("daily cap", b.spent + amt <= p.dailyCap, `${round(b.spent + amt)} against ${p.dailyCap} today`);
      L("rate limit", b.recent.length < p.maxPerHour, `${b.recent.length} of ${p.maxPerHour} this hour`);
      if (ctx.reference !== undefined) {
        const dev = Math.abs(amt - ctx.reference) / Math.max(ctx.reference, 1e-9) * 100;
        L("deviation", dev <= p.deviationPct, `${dev.toFixed(0)} percent off the reference price`);
      }
      if (intent.kind === "pay_instalment") {
        if (ctx.fee) {
          const share = amt / ctx.fee;
          const [lo, hi] = p.rateBand;
          L("rate band", share >= lo && share <= hi, `instalment is ${(share * 100).toFixed(0)} percent of the fee, band ${lo * 100} to ${hi * 100}`);
        } else L("rate band", false, "no fee given, the band cannot be checked");
      }
    }

    if (intent.kind === "accept_job") {
      L("geofence", p.geofences.includes(intent.geofence ?? ""), `job inside ${intent.geofence ?? "no geofence"}`);
      const contact = ctx.requester ? p.contacts[ctx.requester] : undefined;
      L("contact", !!contact, contact ? `${ctx.requester} is a known contact (${contact})` : `${ctx.requester ?? "unknown sender"} is not on the contact list`);
      if (ctx.listing) {
        const inBand = amt >= ctx.listing.feeMin && amt <= ctx.listing.feeMax;
        L("listing band", inBand, `fee ${amt} against listing ${ctx.listing.feeMin} to ${ctx.listing.feeMax}`);
      } else L("listing band", false, "no listing to check the fee against");
      if (ctx.eco) L("economics", ctx.eco.clears, `margin ${ctx.eco.margin} against reserve rule ${ctx.eco.reserveRule}`);
      else L("economics", false, "no unit economics computed");
    }

    if (intent.kind === "start_task") {
      const job = ctx.job;
      L("job", !!job && job.status === "locked", job ? `job ${job.id} is ${job.status}` : "no such job");
      L("job geofence", !!job && intent.geofence === job.geofence, job ? `intent ${intent.geofence} against job ${job.geofence}` : "no job");
      L("geofence", p.geofences.includes(intent.geofence ?? ""), `task inside ${intent.geofence ?? "no geofence"}`);
      if (p.coverRequired) L("cover bound", !!intent.coverBound, intent.coverBound ? "cover is bound for this task" : "no cover bound");
      if (ctx.bond && job) {
        const worst = round(job.fee * 0.25);
        const covers = ctx.bond.balance >= Math.max(ctx.bond.min, worst);
        const earnIn = !covers && ctx.bond.balance < ctx.bond.min && job.fee <= p.earnInMaxFee;
        L("solvency", covers || earnIn, covers ? `bond ${ctx.bond.balance} covers worst case ${worst} and minimum ${ctx.bond.min}` : earnIn ? `bond ${ctx.bond.balance} below minimum ${ctx.bond.min}, fee ${job.fee} within the earn-in cap ${p.earnInMaxFee}` : `bond ${ctx.bond.balance} does not cover worst case ${worst}`);
      }
    }

    if (intent.kind === "claim_done") {
      L("confirmation", !!intent.confirmed, intent.confirmed ? "requester signature present" : "no requester signature");
    }

    if (intent.kind === "set_cap" || intent.kind === "top_up") {
      const isOp = sigOk && signer.toLowerCase() === ADDR.operator.toLowerCase();
      L("operator only", isOp, isOp ? "signed with the operator key held by the button" : `signer ${short(signer)} is not the operator key`, "L3");
    }

    const failed = lines.filter((l) => !l.ok);
    let verdict: PolicyDecision["verdict"] = "allow";
    if (failed.length) {
      // A valid machine intent that needs the button escalates. Everything else denies.
      const onlyTier = failed.every((l) => l.rule === "operator only");
      verdict = onlyTier && sigOk && intent.actor === "machine" ? "escalate" : "deny";
    }
    if (verdict === "allow" && (intent.kind === "pay" || intent.kind === "pay_instalment")) {
      b.spent = round(b.spent + amt);
      b.recent.push(Date.now());
    }
    return { intentId: intent.id, verdict, lines, signer };
  }
}

function distance(a: string, b: string) {
  const x = a.toLowerCase(), y = b.toLowerCase();
  if (x.length !== y.length) return Math.abs(x.length - y.length) + 3;
  let d = 0;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) d++;
  return d;
}

function round(n: number) { return Math.round(n * 100) / 100; }

export function short(a?: string) {
  if (!a) return "none";
  return a.length > 12 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a;
}
