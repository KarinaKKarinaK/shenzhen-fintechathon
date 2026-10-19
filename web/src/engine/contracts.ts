// In-memory mirrors of the contracts in /contracts: IntentLog, JobBoard, Bond and Lease.
// Same rules, same order of checks, same revert messages. The chain adapter records each
// state change as a transaction. All amounts are yuan.
//
// Invariants (BONDED_AGENT_FIXES.md, B.0):
// 1. No fact is taken from the caller when a contract can read it.
// 2. The pilot bond is slashed only by pilot rules, the vendor bond only by vendor rules.
// 3. A proof is accepted only if the intent was committed to the log for the same job first.
// 4. Each intent hash is used as proof once.
// 5. Only parties of a live job can submit proof. Shadow jobs accept registered hunters.
// 6. Neither the policy engine nor the model decides a slash. The contract reads records.

import type { Chain } from "./chain";
import type { BondKind, ChainTx, Intent, Job } from "./types";
import { DEFAULT_POLICY } from "./policy";
import { ADDR, intentHash, isKeyed, recoverSigner } from "./keys";

const A = DEFAULT_POLICY.allowlist;
const round = (n: number) => Math.round(n * 100) / 100;
const ZERO = "0x0000000000000000000000000000000000000000";
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// The rule table. Each rule is tagged with the bond it slashes, so the contract never judges
// fault: the broken rule decides who pays.
export type SlashRule = "PayeeNotAllowlisted" | "OverCap" | "FalseConfirmation" | "OutsideGeofence";

export const RULES: Record<SlashRule, { bond: BondKind; text: string; readFrom: string }> = {
  PayeeNotAllowlisted: { bond: "vendor", text: "a payment to a payee not on the agent's allowlist", readFrom: "signed intent, Bond allowlist" },
  OverCap: { bond: "vendor", text: "a payment over the per transaction cap", readFrom: "signed intent, Bond cap" },
  FalseConfirmation: { bond: "pilot", text: "a claim that a job was confirmed when the board shows it was not", readFrom: "signed intent, JobBoard" },
  OutsideGeofence: { bond: "pilot", text: "a task started outside the field the job allows", readFrom: "signed intent, JobBoard" },
};

export const SLASH_RULES = Object.keys(RULES) as SlashRule[];

// Append-only, per-job record of intent hashes. Only the agent key commits, before the policy
// engine decides. The hash reveals nothing but proves the intent existed in that exact form.
export class IntentLog {
  private entries = new Map<string, { jobId: string; agent: string; at: number }>();
  commit(jobId: string, hash: string, agent: string): { at: number } {
    if (this.entries.has(hash)) throw new Error("already committed");
    const at = Date.now();
    this.entries.set(hash, { jobId, agent, at });
    return { at };
  }
  committedAt(hash: string) { return this.entries.get(hash)?.at ?? 0; }
  jobOf(hash: string) { return this.entries.get(hash)?.jobId ?? ""; }
  agentOf(hash: string) { return this.entries.get(hash)?.agent ?? ZERO; }
  size() { return this.entries.size; }
}

export const HOLD_SHARE = 0.1333;
export const HOLD_MS = 24 * 3600_000;

// The parties of every live job in the demo: the farmer (requester and verifier), the pilot
// (operator), the lender of the lease and the vendor of the agent.
export const PARTIES = { farmer: ADDR.requester, pilot: ADDR.operator, lender: ADDR.lender, vendor: ADDR.vendor };

export class JobBoard {
  jobs = new Map<string, Job>();
  constructor(private chain: Chain) {}
  async post(job: Job): Promise<ChainTx> {
    this.jobs.set(job.id, { ...job, status: "locked" });
    return this.chain.send("lock", `${job.shadow ? "shadow job, " : ""}fee ${job.fee} yuan locked for ${job.title}`, A.requester, A.rail, job.fee);
  }
  // Read-only views for Bond. Every fact a proof needs comes from here, never from the reporter.
  isConfirmed(jobId: string) { const s = this.jobs.get(jobId)?.status; return s === "confirmed" || s === "released"; }
  geofenceOf(jobId: string) { return this.jobs.get(jobId)?.geofence ?? ""; }
  isShadow(jobId: string) { return !!this.jobs.get(jobId)?.shadow; }
  isParty(jobId: string, who: string) {
    const job = this.jobs.get(jobId);
    if (!job || job.shadow) return false;
    return Object.values(PARTIES).some((p) => same(p, who));
  }
  partiesOf(jobId: string): string[] {
    const job = this.jobs.get(jobId);
    if (!job || job.shadow) return [];
    return Object.values(PARTIES);
  }
  // The farmer's confirmation. Recorded on the board, which is what FalseConfirmation reads.
  confirm(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error("no such job");
    if (job.status !== "locked" && job.status !== "running") throw new Error("job not running");
    job.status = "confirmed";
    return job;
  }
  // Fee to the machine, rail fee back, and a capped hold the requester can flag within 24 hours.
  async release(jobId: string, to: string, split: NonNullable<Job["split"]>): Promise<ChainTx[]> {
    const job = this.jobs.get(jobId)!;
    if (job.status !== "confirmed") throw new Error("not confirmed");
    job.status = "released";
    job.split = split;
    job.hold = round(job.fee * HOLD_SHARE);
    job.holdUntil = Date.now() + HOLD_MS;
    const out: ChainTx[] = [];
    out.push(await this.chain.send("fee_in", `fee ${job.fee} yuan released to the drone wallet`, A.rail, to, job.fee));
    if (split.rail > 0) out.push(await this.chain.send("rail", `rail fee ${split.rail} yuan`, to, A.rail, split.rail));
    if (job.hold > 0) out.push(await this.chain.send("hold", `hold ${job.hold} yuan kept for 24 hours`, to, A.rail, job.hold));
    return out;
  }
  // A job the agent declined, or one that never started after its window, is cancelled and the
  // locked fee goes back to the farmer.
  async cancel(jobId: string): Promise<ChainTx> {
    const job = this.jobs.get(jobId)!;
    if (job.status !== "locked") throw new Error("job already started");
    job.status = "declined";
    return this.chain.send("refund", `job cancelled, fee ${job.fee} yuan back to the farmer`, A.rail, A.requester, job.fee);
  }
  async refund(jobId: string): Promise<ChainTx> {
    const job = this.jobs.get(jobId)!;
    job.status = "held";
    return this.chain.send("refund", `fee ${job.fee} yuan held after a flag`, A.rail, A.requester, job.fee);
  }
  // Unflagged holds release to the machine at the end of the window (the run end in the demo).
  async releaseHolds(to: string): Promise<{ tx: ChainTx; job: Job }[]> {
    const out: { tx: ChainTx; job: Job }[] = [];
    for (const job of this.jobs.values()) {
      if (job.status !== "released" || !job.hold) continue;
      const tx = await this.chain.send("release", `hold ${job.hold} yuan released, no flag`, A.rail, to, job.hold);
      job.hold = 0;
      out.push({ tx, job });
    }
    return out;
  }
}

export interface BondOpts {
  min: number; // reward threshold for the pilot bond
  slashAmount: number; // fixed slash from the pilot bond
  startFloor: number; // added to the pilot bond in the start check
  vendor: { balance: number; penalty: number; dailyCap: number };
}

export interface SlashResult {
  slash: ChainTx; // the full amount leaving the bond, to the treasury
  payout: ChainTx | null; // a bounty to the hunter on a shadow job, compensation to the farmer for a pilot rule, none for a vendor rule on a live job
  bond: BondKind;
  shadow: boolean;
  intentHash: string;
  signer: string;
  signatureOk: boolean;
  amount: number;
  bountyAmount: number; // non zero only on shadow jobs
  compensation: number; // non zero only on live jobs
  treasury: number;
}

export class BondContract {
  balance = 0; // the pilot bond, earned from fees
  min: number;
  slashAmount: number;
  startFloor: number;
  vendor: { balance: number; penalty: number; dailyCap: number; slashedToday: number; day: number };
  private spent = new Set<string>();
  private hunters = new Set<string>();
  constructor(opts: BondOpts, private chain: Chain, public log: IntentLog, public board: JobBoard) {
    this.min = opts.min;
    this.slashAmount = opts.slashAmount;
    this.startFloor = opts.startFloor;
    this.vendor = { ...opts.vendor, slashedToday: 0, day: 0 };
  }

  // No minimum here. Bond plus floor must cover the exposure.
  covers(exposure: number) { return this.balance + this.startFloor >= exposure; }

  async fill(from: string, amount: number): Promise<ChainTx> {
    this.balance = round(this.balance + amount);
    return this.chain.send("bond_fill", `pilot bond filled by ${amount} yuan from the fee`, from, A.bond, amount);
  }
  async topUp(from: string, amount: number): Promise<ChainTx> {
    this.balance = round(this.balance + amount);
    return this.chain.send("top_up", `pilot topped up the bond by ${amount} yuan`, from, A.bond, amount);
  }
  async postVendorBond(from: string, amount: number): Promise<ChainTx> {
    this.vendor.balance = round(this.vendor.balance + amount);
    return this.chain.send("vendor_bond", `vendor bond of ${amount} yuan posted`, from, A.bond, amount);
  }
  registerHunter(addr: string) { this.hunters.add(addr.toLowerCase()); }
  isHunter(addr: string) { return this.hunters.has(addr.toLowerCase()); }

  // A party of a live job, or a registered hunter on a shadow job, points at a logged intent
  // and names the rule. The contract recovers the signer, checks the log, checks the rule
  // against its own records and the board, then slashes the bond the rule is tagged with.
  async slashByProof(intent: Intent, rule: SlashRule, submitter: string): Promise<SlashResult> {
    if (intent.actor !== "machine") throw new Error("unknown agent");
    const hash = intentHash(intent);
    if (this.spent.has(hash)) throw new Error("proof already used");
    const signer = await recoverSigner(intent);
    const expected = isKeyed(intent.actor) ? ADDR[intent.actor] : "";
    const signatureOk = !!expected && same(signer, expected);
    if (!signatureOk) throw new Error("not the agent's signature");
    const jobId = intent.jobId ?? "";
    if (!this.log.committedAt(hash) || this.log.jobOf(hash) !== jobId || !same(this.log.agentOf(hash), expected)) throw new Error("not in log");
    const shadow = this.board.isShadow(jobId);
    const party = this.board.isParty(jobId, submitter);
    if (!(party || (shadow && this.isHunter(submitter)))) throw new Error("not a party");
    if (!violates(intent, rule, this.board)) throw new Error("no violation");
    const bond = RULES[rule].bond;
    let amount: number;
    if (bond === "vendor") {
      const day = Math.floor(Date.now() / 86_400_000);
      if (this.vendor.day !== day) { this.vendor.day = day; this.vendor.slashedToday = 0; }
      if (this.vendor.slashedToday + this.vendor.penalty > this.vendor.dailyCap) throw new Error("daily cap reached");
      amount = Math.min(this.vendor.penalty, this.vendor.balance);
      this.vendor.balance = round(this.vendor.balance - amount);
      this.vendor.slashedToday = round(this.vendor.slashedToday + amount);
    } else {
      amount = Math.min(this.slashAmount, this.balance);
      this.balance = round(this.balance - amount);
    }
    this.spent.add(hash);
    // Mirrors Bond.sol. Shadow job: half to the hunter as a bounty. Pilot rule on a live job: half
    // to the farmer, the party the false claim harmed. Vendor rule on a live job: all of it to the
    // treasury. The payment was blocked so nobody lost money, and every party can submit, so paying
    // a party would let the pilot stage a fake scam and collect the vendor's penalty.
    const toTreasuryOnly = !shadow && bond === "vendor";
    const half = toTreasuryOnly ? 0 : round(amount / 2);
    const treasury = round(amount - half);
    const slash = await this.chain.send("slash", `${bond} bond slashed ${amount} yuan for ${rule}, intent ${intent.id}`, A.bond, A.rail, amount, { rule, bond });
    const payout = shadow
      ? await this.chain.send("bounty", `bounty ${half} yuan to the hunter, shadow job ${jobId}`, A.rail, submitter, half, { rule, bond })
      : toTreasuryOnly ? null
      : await this.chain.send("compensation", `${half} yuan to the farmer, ${treasury} yuan to the treasury`, A.rail, ADDR.requester, half, { rule, bond });
    return { slash, payout, bond, shadow, intentHash: hash, signer, signatureOk, amount, bountyAmount: shadow ? half : 0, compensation: shadow ? 0 : half, treasury };
  }
}

// The rule check. What the agent did comes from the signed intent, what was allowed from the
// policy mirror, what happened from the board. The reporter supplies nothing but the pointer.
export function violates(intent: Intent, rule: SlashRule, board: JobBoard): boolean {
  const p = DEFAULT_POLICY;
  const isPayment = intent.kind === "pay" || intent.kind === "pay_instalment";
  switch (rule) {
    case "PayeeNotAllowlisted": return isPayment && !Object.values(p.allowlist).some((a) => same(a, intent.payee ?? ""));
    case "OverCap": return isPayment && (intent.amount ?? 0) > p.perTxCap;
    case "FalseConfirmation": return intent.kind === "claim_done" && intent.confirmed === true && !board.isConfirmed(intent.jobId ?? "");
    case "OutsideGeofence": return intent.kind === "start_task" && (intent.geofence ?? "") !== board.geofenceOf(intent.jobId ?? "");
  }
}

export class LeaseContract {
  balance: number;
  owned = false;
  frozen = false;
  constructor(public total: number, public rate: number, private chain: Chain) { this.balance = total; }
  instalmentFor(fee: number) { return round(Math.min(fee * this.rate, this.balance)); }
  // The caller computes the instalment once (capped at the balance), signs it, and passes the same value here.
  async take(inst: number, from: string): Promise<{ tx: ChainTx; title?: ChainTx }> {
    if (inst > this.balance + 1e-9) throw new Error("over balance");
    this.balance = round(this.balance - inst);
    const tx = await this.chain.send("instalment", `instalment ${inst} yuan to the lender`, from, A.lender, inst);
    if (this.balance <= 0 && !this.owned) {
      this.owned = true;
      const title = await this.chain.send("title", "title transferred from the lender to the pilot", A.lender, from, 0);
      return { tx, title };
    }
    return { tx };
  }
}
