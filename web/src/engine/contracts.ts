// In-memory mirrors of the three contracts in /contracts. Same rules, same events.
// The chain adapter records each state change as a transaction.

import { recoverMessageAddress } from "viem";
import type { Chain } from "./chain";
import type { ChainTx, Intent, Job } from "./types";
import { DEFAULT_POLICY } from "./policy";
import { ADDR, canonical, intentHash, isKeyed } from "./keys";

const A = DEFAULT_POLICY.allowlist;
const round = (n: number) => Math.round(n * 100) / 100;

export type SlashRule = "allowlist" | "geofence" | "confirmation" | "cover" | "cap";

export interface SlashResult {
  slash: ChainTx;
  bounty: ChainTx;
  intentHash: string;
  signer: string;
  signatureOk: boolean;
  amount: number;
  bountyAmount: number;
}

export class BondContract {
  balance = 0;
  private spent = new Set<string>();
  constructor(public min: number, public slashAmount: number, public bountyShare: number, private chain: Chain) {}
  covers(worstCase: number) { return this.balance >= Math.max(this.min, worstCase); }
  async fill(from: string, amount: number): Promise<ChainTx> {
    this.balance = round(this.balance + amount);
    return this.chain.send("bond_fill", `bond filled by ${amount}`, from, A.bond, amount);
  }
  async topUp(from: string, amount: number): Promise<ChainTx> {
    this.balance = round(this.balance + amount);
    return this.chain.send("top_up", `operator topped up the bond by ${amount}`, from, A.bond, amount);
  }

  // Anyone holding a signed intent that breaks a checkable rule can submit it.
  // The contract recomputes the body hash from the fields, recovers the signer, checks the
  // rule against the same fields, and burns the hash so the proof cannot be used twice.
  async slashByProof(intent: Intent, rule: SlashRule, submitter: string): Promise<SlashResult> {
    const hash = intentHash(intent);
    if (this.spent.has(hash)) throw new Error("proof already used");
    let signer = "0x0000000000000000000000000000000000000000";
    try { signer = await recoverMessageAddress({ message: canonical(intent), signature: intent.signature as `0x${string}` }); } catch { /* bad signature */ }
    const expected = isKeyed(intent.actor) ? ADDR[intent.actor] : "";
    const signatureOk = !!expected && signer.toLowerCase() === expected.toLowerCase();
    if (!signatureOk) throw new Error("not the agent's signature");
    if (!violates(intent, rule)) throw new Error("no violation");
    this.spent.add(hash);
    const amount = Math.min(this.slashAmount, this.balance);
    this.balance = round(this.balance - amount);
    const bountyAmount = round(amount * this.bountyShare);
    const slash = await this.chain.send("slash", `slashed ${amount} for ${rule}, intent ${intent.id}`, A.bond, A.rail, amount);
    slash.rule = rule;
    const bounty = await this.chain.send("bounty", `bounty ${bountyAmount} paid to the submitter`, A.bond, submitter, bountyAmount);
    return { slash, bounty, intentHash: hash, signer, signatureOk, amount, bountyAmount };
  }
}

export function violates(intent: Intent, rule: SlashRule): boolean {
  const p = DEFAULT_POLICY;
  switch (rule) {
    case "allowlist": return (intent.kind === "pay" || intent.kind === "pay_instalment") && !Object.values(p.allowlist).some((a) => a.toLowerCase() === (intent.payee ?? "").toLowerCase());
    case "geofence": return intent.kind === "start_task" && !p.geofences.includes(intent.geofence ?? "");
    case "confirmation": return intent.kind === "claim_done" && !intent.confirmed;
    case "cover": return intent.kind === "start_task" && !intent.coverBound;
    case "cap": return (intent.kind === "pay" || intent.kind === "pay_instalment") && (intent.amount ?? 0) > p.perTxCap;
  }
}

export class LeaseContract {
  balance: number;
  owned = false;
  frozen = false;
  constructor(public total: number, public rate: number, private chain: Chain) { this.balance = total; }
  instalmentFor(fee: number) { return round(fee * this.rate); }
  // The caller computes the instalment once (capped at the balance), signs it, and passes the same value here.
  async take(inst: number, from: string): Promise<{ tx: ChainTx; title?: ChainTx }> {
    if (inst > this.balance + 1e-9) throw new Error("over balance");
    this.balance = round(this.balance - inst);
    const tx = await this.chain.send("instalment", `instalment ${inst} to the lender`, from, A.lender, inst);
    if (this.balance <= 0 && !this.owned) {
      this.owned = true;
      const title = await this.chain.send("title", "title transferred to the operator", A.lender, from, 0);
      return { tx, title };
    }
    return { tx };
  }
}

export const HOLD_SHARE = 0.1333;
export const HOLD_MS = 24 * 3600_000;

export class JobBoard {
  jobs = new Map<string, Job>();
  constructor(private chain: Chain) {}
  async post(job: Job): Promise<ChainTx> {
    this.jobs.set(job.id, { ...job, status: "locked" });
    return this.chain.send("lock", `fee ${job.fee} locked for ${job.title}`, A.requester, A.rail, job.fee);
  }
  // Fee to the machine, rail fee back, and a capped hold the requester can flag within 24 hours.
  async release(jobId: string, to: string, split: NonNullable<Job["split"]>): Promise<ChainTx[]> {
    const job = this.jobs.get(jobId)!;
    job.status = "released";
    job.split = split;
    job.hold = round(job.fee * HOLD_SHARE);
    job.holdUntil = Date.now() + HOLD_MS;
    const out: ChainTx[] = [];
    out.push(await this.chain.send("fee_in", `fee ${job.fee} released to the machine`, A.rail, to, job.fee));
    if (split.rail > 0) out.push(await this.chain.send("rail", `rail fee ${split.rail}`, to, A.rail, split.rail));
    if (job.hold > 0) out.push(await this.chain.send("hold", `hold ${job.hold} kept for 24 hours`, to, A.rail, job.hold));
    return out;
  }
  async refund(jobId: string): Promise<ChainTx> {
    const job = this.jobs.get(jobId)!;
    job.status = "held";
    return this.chain.send("refund", `fee ${job.fee} held after a flag`, A.rail, A.requester, job.fee);
  }
  // Unflagged holds release to the machine at the end of the window (the run end in the demo).
  async releaseHolds(to: string): Promise<{ tx: ChainTx; job: Job }[]> {
    const out: { tx: ChainTx; job: Job }[] = [];
    for (const job of this.jobs.values()) {
      if (job.status !== "released" || !job.hold) continue;
      const tx = await this.chain.send("release", `hold ${job.hold} released, no flag`, A.rail, to, job.hold);
      job.hold = 0;
      out.push({ tx, job });
    }
    return out;
  }
}
