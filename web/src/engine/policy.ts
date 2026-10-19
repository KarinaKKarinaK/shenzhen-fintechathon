// Deterministic policy engine. Sits between every agent and its wallet.
// Rules are data. The model never sees this code and cannot change it.

import type { Intent, PolicyDecision, PolicyLine } from "./types";

export interface Policy {
  allowlist: Record<string, string>; // name -> address
  perTxCap: number;
  dailyCap: number;
  rateBand: [number, number]; // allowed instalment share of a fee
  maxPerHour: number;
  deviationPct: number;
  geofences: string[];
  coverRequired: boolean;
}

export const DEFAULT_POLICY: Policy = {
  allowlist: {
    lender: "0x5a1eC0ffee0000000000000000000000000000A1",
    requester: "0x7b2fC0ffee0000000000000000000000000000B2",
    charging: "0x9c3dC0ffee0000000000000000000000000000C3",
    coverpool: "0x2d4eC0ffee0000000000000000000000000000D4",
    bond: "0x4e5fC0ffee0000000000000000000000000000E5",
    rail: "0x6f60C0ffee0000000000000000000000000000F6",
  },
  perTxCap: 120,
  dailyCap: 600,
  rateBand: [0.2, 0.45],
  maxPerHour: 12,
  deviationPct: 25,
  geofences: ["flat-4b", "field-north", "route-nanshan-futian", "route-field-a"],
  coverRequired: true,
};

export class PolicyEngine {
  private spentToday = 0;
  private recent: number[] = [];
  constructor(public policy: Policy = DEFAULT_POLICY) {}

  evaluate(intent: Intent, ctx: { reference?: number; fee?: number } = {}): PolicyDecision {
    const lines: PolicyLine[] = [];
    const now = Date.now();
    this.recent = this.recent.filter((t) => now - t < 3600_000);

    lines.push({ rule: "signature", ok: intent.signature.startsWith("sig:"), detail: "typed intent signed by the agent key" });

    if (intent.kind === "pay" || intent.kind === "pay_instalment") {
      const known = Object.values(this.policy.allowlist).includes(intent.payee ?? "");
      lines.push({ rule: "allowlist", ok: known, detail: known ? "payee is on the allowlist" : `payee ${short(intent.payee)} is not on the allowlist` });
      const amt = intent.amount ?? 0;
      lines.push({ rule: "per transaction cap", ok: amt <= this.policy.perTxCap, detail: `${amt} against cap ${this.policy.perTxCap}` });
      lines.push({ rule: "daily cap", ok: this.spentToday + amt <= this.policy.dailyCap, detail: `${this.spentToday + amt} against ${this.policy.dailyCap} today` });
      lines.push({ rule: "rate limit", ok: this.recent.length < this.policy.maxPerHour, detail: `${this.recent.length} of ${this.policy.maxPerHour} this hour` });
      if (ctx.reference !== undefined) {
        const dev = Math.abs(amt - ctx.reference) / Math.max(ctx.reference, 1e-9) * 100;
        lines.push({ rule: "deviation", ok: dev <= this.policy.deviationPct, detail: `${dev.toFixed(0)} percent off the reference price` });
      }
      if (intent.kind === "pay_instalment" && ctx.fee) {
        const share = amt / ctx.fee;
        const [lo, hi] = this.policy.rateBand;
        lines.push({ rule: "rate band", ok: share >= lo && share <= hi, detail: `instalment is ${(share * 100).toFixed(0)} percent of the fee, band ${lo * 100} to ${hi * 100}` });
      }
    }

    if (intent.kind === "start_task") {
      lines.push({ rule: "geofence", ok: this.policy.geofences.includes(intent.geofence ?? ""), detail: `task inside ${intent.geofence ?? "no geofence"}` });
      if (this.policy.coverRequired) lines.push({ rule: "cover bound", ok: !!intent.coverBound, detail: intent.coverBound ? "cover is bound for this task" : "no cover bound" });
    }

    if (intent.kind === "claim_done") {
      lines.push({ rule: "confirmation", ok: !!intent.confirmed, detail: intent.confirmed ? "requester signature present" : "no requester signature" });
    }

    if (intent.kind === "set_cap" || intent.kind === "top_up") {
      lines.push({ rule: "operator only", ok: intent.actor === "operator", detail: intent.actor === "operator" ? "signed with the hardware key" : "only the physical button can do this" });
    }

    const failed = lines.filter((l) => !l.ok);
    let verdict: PolicyDecision["verdict"] = "allow";
    if (failed.length) verdict = failed.some((l) => l.rule === "operator only" || l.rule === "per transaction cap") ? "escalate" : "deny";
    if (verdict === "allow" && (intent.kind === "pay" || intent.kind === "pay_instalment")) {
      this.spentToday += intent.amount ?? 0;
      this.recent.push(now);
    }
    return { intentId: intent.id, verdict, lines };
  }
}

export function short(a?: string) {
  if (!a) return "none";
  return a.length > 12 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a;
}
