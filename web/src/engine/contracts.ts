// In-memory mirrors of the three contracts in /contracts. Same rules, same events.
// The chain adapter records each state change as a transaction.

import type { Chain } from "./chain";
import type { ChainTx, Intent, Job } from "./types";
import { DEFAULT_POLICY } from "./policy";

const A = DEFAULT_POLICY.allowlist;

export class BondContract {
  balance = 0;
  constructor(public min: number, public slashAmount: number, public bountyShare: number, private chain: Chain) {}
  covers(worstCase: number) { return this.balance >= Math.max(this.min, worstCase); }
  async fill(from: string, amount: number): Promise<ChainTx> {
    this.balance += amount;
    return this.chain.send("bond_fill", `bond filled by ${amount}`, from, A.bond, amount);
  }
  async topUp(from: string, amount: number): Promise<ChainTx> {
    this.balance += amount;
    return this.chain.send("top_up", `operator topped up the bond`, from, A.bond, amount);
  }
  // Anyone holding a signed intent that breaks a checkable rule can submit it.
  async slashByProof(intent: Intent, rule: string, submitter: string): Promise<{ slash: ChainTx; bounty: ChainTx }> {
    if (!intent.signature.startsWith("sig:")) throw new Error("unsigned intent is not proof");
    const amt = Math.min(this.slashAmount, this.balance);
    this.balance -= amt;
    const bounty = Math.round(amt * this.bountyShare * 100) / 100;
    const slash = await this.chain.send("slash", `slashed ${amt} for ${rule}`, A.bond, A.rail, amt);
    const b = await this.chain.send("bounty", `bounty ${bounty} paid to ${submitter}`, A.bond, submitter, bounty);
    return { slash, bounty: b };
  }
}

export class LeaseContract {
  balance: number;
  owned = false;
  frozen = false;
  constructor(public total: number, public rate: number, private chain: Chain) { this.balance = total; }
  instalmentFor(fee: number) { return Math.round(fee * this.rate * 100) / 100; }
  async take(fee: number, from: string): Promise<{ tx: ChainTx; title?: ChainTx }> {
    const inst = Math.min(this.instalmentFor(fee), this.balance);
    this.balance = Math.round((this.balance - inst) * 100) / 100;
    const tx = await this.chain.send("instalment", `instalment ${inst} to the lender`, from, A.lender, inst);
    if (this.balance <= 0 && !this.owned) {
      this.owned = true;
      const title = await this.chain.send("title", "title transferred to the operator", A.lender, from, 0);
      return { tx, title };
    }
    return { tx };
  }
}

export class JobBoard {
  jobs = new Map<string, Job>();
  constructor(private chain: Chain) {}
  async post(job: Job): Promise<ChainTx> {
    this.jobs.set(job.id, { ...job, status: "locked" });
    return this.chain.send("lock", `fee ${job.fee} locked for ${job.title}`, A.requester, A.rail, job.fee);
  }
  async release(jobId: string, to: string, split: NonNullable<Job["split"]>): Promise<ChainTx[]> {
    const job = this.jobs.get(jobId)!;
    job.status = "released";
    job.split = split;
    const out: ChainTx[] = [];
    out.push(await this.chain.send("fee_in", `fee ${job.fee} released to the machine`, A.rail, to, job.fee));
    if (split.rail > 0) out.push(await this.chain.send("energy", `rail fee ${split.rail}`, to, A.rail, split.rail));
    return out;
  }
  async refund(jobId: string): Promise<ChainTx> {
    const job = this.jobs.get(jobId)!;
    job.status = "held";
    return this.chain.send("refund", `fee ${job.fee} held after a flag`, A.rail, A.requester, job.fee);
  }
}
