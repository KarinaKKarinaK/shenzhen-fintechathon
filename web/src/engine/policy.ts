// Deterministic policy engine. Sits between every agent and its wallet.
// Rules are data. The model never sees this code and cannot change it.
// All amounts are yuan.

import { keccak256 } from "viem";
import { ADDR, isKeyed, recoverSigner } from "./keys";
import type { Actor, Economics, Intent, Job, PolicyDecision, PolicyLine, Tier } from "./types";
import { both, type TrKey, type TrVars } from "./i18n";

export interface Policy {
  allowlist: Record<string, string>; // name -> address
  contacts: Record<string, string>; // display name -> allowlist name
  perTxCap: number; // yuan per signed payment
  dailyCap: number; // yuan per day
  rateBand: [number, number]; // allowed instalment share of a fee
  maxPerHour: number;
  deviationPct: number;
  geofences: string[];
}

export const DEFAULT_POLICY: Policy = {
  allowlist: {
    lender: "0x5a1eC0ffee0000000000000000000000000000A1",
    requester: "0x7b2fC0ffee0000000000000000000000000000B2",
    charging: "0x9c3dC0ffee0000000000000000000000000000C3",
    bond: "0x4e5fC0ffee0000000000000000000000000000E5",
    rail: "0x6f60C0ffee0000000000000000000000000000F6",
    hunter: "0x8a7bC0ffee0000000000000000000000000000A7",
  },
  contacts: { "Farmer Lin": "requester", "Farmer Zhao": "requester" },
  perTxCap: 1000,
  dailyCap: 5000,
  rateBand: [0.2, 0.45],
  maxPerHour: 12,
  deviationPct: 25,
  geofences: ["field-north", "field-south", "field-east", "field-west"],
};

// The demo numbers, in yuan, shared by the scenarios and the attack set.
export const DEMO = {
  droneCost: 55_000,
  leaseMu: 13_750, // the lease is spread over this many mu
  startFloor: 200, // added to the pilot bond in the start check
  bondMin: 2_000, // the reward threshold for the pilot bond, never a start condition
  pilotSlash: 200, // fixed slash from the pilot bond per proven pilot violation
  vendorBond: 5_000, // posted up front by the vendor
  vendorPenalty: 200, // fixed slash from the vendor bond per proven agent violation
  vendorDailyCap: 1_000, // max slashed from the vendor bond per day
  leaseRate: 0.4, // instalment share of each fee
  energyPerMu: 0.6, // charging cost per mu sprayed
  reserveRule: 30, // minimum margin per job
};

// Permission tiers as data, for the dashboard.
export const TIERS: { tier: Tier; name: string; rule: string; who: string }[] = [
  { tier: "L0", name: "Read", rule: "Read prices, balances, messages. Nothing moves.", who: "Any agent, the model" },
  { tier: "L1", name: "Draft", rule: "Write text and read messages into fields. Cannot name a payee or an amount.", who: "The model" },
  { tier: "L2", name: "Engine allow", rule: "Payments on the allowlist inside the caps, tasks inside the job's field with the bond covering the job.", who: "Machine key through the policy engine" },
  { tier: "L3", name: "Operator key", rule: "Raise a cap, change the rate band, widen a geofence, top up the bond.", who: "The physical button only" },
];

export interface EvalContext {
  reference?: number;
  fee?: number;
  listing?: { feeMin: number; feeMax: number };
  requester?: string;
  eco?: Economics;
  job?: Job;
  bond?: { balance: number; min: number; floor: number };
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
    // Each detail is rendered in English and Chinese from the same template, so the JSON keeps the English and the UI can show either.
    const L = (rule: string, ok: boolean, key: TrKey, vars: TrVars = {}, tier: Tier = "L2") => { const d = both(key, vars); lines.push({ rule, ok, detail: d.en, detailZh: d.zh, tier }); };
    const p = this.policy;
    const b = book(this.scope, intent.actor);

    // 1. Signature: the typed intent must be signed by the key of the actor it names.
    const signer = await recoverSigner(intent);
    const expected = isKeyed(intent.actor) ? ADDR[intent.actor] : null;
    const sigOk = !!expected && signer.toLowerCase() === expected.toLowerCase();
    L("signature", sigOk, sigOk ? "p.sigOk" : "p.sigBad", { signer: short(signer), actor: intent.actor, expected: short(expected ?? undefined) });

    // 2. Replay: each signature is accepted once, ever.
    const sigHash = keccak256(intent.signature as `0x${string}`);
    const replayed = spent.has(sigHash);
    spent.add(sigHash);
    L("replay", !replayed, replayed ? "p.replayed" : "p.fresh", { nonce: intent.nonce });

    const money = intent.kind === "pay" || intent.kind === "pay_instalment" || intent.kind === "top_up" || intent.kind === "set_cap" || intent.kind === "accept_job";
    const amt = intent.amount ?? 0;
    if (money) {
      const amountOk = Number.isFinite(amt) && amt > 0 && Math.abs(Math.round(amt * 100) - amt * 100) < 1e-6;
      L("amount", amountOk, amountOk ? "p.amountOk" : "p.amountBad", { amt });
    }

    // 3. Provenance: a payee or amount read out of a message is never used.
    const pv = intent.provenance;
    if (pv && (intent.kind === "pay" || intent.kind === "pay_instalment")) {
      const ok = pv.amount !== "message" && pv.payee !== "message";
      const src = (v: string): TrVars[string] => (v === "tool" ? { k: "w.tool" } : v === "message" ? { k: "w.message" } : v === "allowlist" ? { k: "w.allowlist" } : { k: "w.none" });
      L("provenance", ok, ok ? "p.provOk" : "p.provBad", { a: src(pv.amount), p: src(pv.payee), which: { k: pv.amount === "message" ? "w.amount" : "w.payee" } });
    }

    if (intent.kind === "pay" || intent.kind === "pay_instalment") {
      const payee = intent.payee ?? "";
      const known = Object.values(p.allowlist).some((a) => a.toLowerCase() === payee.toLowerCase());
      L("allowlist", known, known ? "p.allowOk" : "p.allowBad", { payee: short(payee) });
      if (!known) {
        const near = Object.entries(p.allowlist).map(([name, a]) => ({ name, a, d: distance(a, payee) })).find((x) => x.d >= 1 && x.d <= 3);
        if (near) L("lookalike", false, "p.lookalike", { name: near.name, addr: short(near.a), d: near.d, s: near.d > 1 ? { k: "w.s" } : "" });
      }
      if (intent.kind === "pay_instalment") {
        const toLender = payee.toLowerCase() === p.allowlist.lender.toLowerCase();
        L("instalment payee", toLender, toLender ? "p.instOk" : "p.instBad");
      }
      L("per transaction cap", amt <= p.perTxCap, "p.perTx", { amt, cap: p.perTxCap });
      L("daily cap", b.spent + amt <= p.dailyCap, "p.daily", { total: round(b.spent + amt), cap: p.dailyCap });
      L("rate limit", b.recent.length < p.maxPerHour, "p.rate", { n: b.recent.length, max: p.maxPerHour });
      if (ctx.reference !== undefined) {
        const dev = Math.abs(amt - ctx.reference) / Math.max(ctx.reference, 1e-9) * 100;
        L("deviation", dev <= p.deviationPct, "p.dev", { dev: dev.toFixed(0) });
      }
      if (intent.kind === "pay_instalment") {
        if (ctx.fee) {
          const share = amt / ctx.fee;
          const [lo, hi] = p.rateBand;
          L("rate band", share >= lo && share <= hi, "p.band", { share: (share * 100).toFixed(0), lo: lo * 100, hi: hi * 100 });
        } else L("rate band", false, "p.bandNoFee");
      }
    }

    if (intent.kind === "accept_job") {
      L("geofence", p.geofences.includes(intent.geofence ?? ""), "p.geoJob", { g: intent.geofence || { k: "w.noGeofence" } });
      const contact = ctx.requester ? p.contacts[ctx.requester] : undefined;
      L("contact", !!contact, contact ? "p.contactOk" : "p.contactBad", { who: ctx.requester || { k: "w.unknownSender" }, as: contact });
      if (ctx.listing) {
        const inBand = amt >= ctx.listing.feeMin && amt <= ctx.listing.feeMax;
        L("listing band", inBand, "p.listing", { amt, lo: ctx.listing.feeMin, hi: ctx.listing.feeMax });
      } else L("listing band", false, "p.listingNone");
      if (ctx.eco) L("economics", ctx.eco.clears, "p.eco", { margin: ctx.eco.margin, rule: ctx.eco.reserveRule });
      else L("economics", false, "p.ecoNone");
    }

    if (intent.kind === "start_task") {
      const job = ctx.job;
      if (job) L("job", job.status === "locked", "p.jobIs", { id: job.id, status: job.status }); else L("job", false, "p.noSuchJob");
      if (job) L("job geofence", intent.geofence === job.geofence, "p.jobGeo", { a: intent.geofence, b: job.geofence }); else L("job geofence", false, "p.noJob");
      L("geofence", p.geofences.includes(intent.geofence ?? ""), "p.geoTask", { g: intent.geofence || { k: "w.noGeofence" } });
      if (ctx.bond && job) {
        // Bond plus the starting floor must cover a quarter of the fee. No minimum here: a new
        // machine with an empty bond can start small jobs. The minimum is a reward, not a gate.
        const worst = round(job.fee * 0.25);
        const covers = ctx.bond.balance + ctx.bond.floor >= worst;
        L("solvency", covers, covers ? "p.solvOk" : "p.solvBad", { bond: ctx.bond.balance, floor: ctx.bond.floor, worst });
      }
    }

    if (intent.kind === "claim_done") {
      L("confirmation", !!intent.confirmed, intent.confirmed ? "p.confOk" : "p.confBad");
    }

    if (intent.kind === "set_cap" || intent.kind === "top_up") {
      const isOp = sigOk && signer.toLowerCase() === ADDR.operator.toLowerCase();
      L("operator only", isOp, isOp ? "p.opOk" : "p.opBad", { signer: short(signer) }, "L3");
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
