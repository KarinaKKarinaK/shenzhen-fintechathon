// Shared types for the JiXin engine. Every event the backend emits is one of these.

export type Side = "neighbour" | "fleet" | "attack";

export type Actor = "machine" | "requester" | "lender" | "hunter" | "operator" | "oracle" | "policy" | "chain" | "system";

// Permission tiers. L0 reads, L1 drafts text, L2 is what the engine can allow on its own,
// L3 needs the operator key held by the physical button.
export type Tier = "L0" | "L1" | "L2" | "L3";

export interface Provenance {
  amount: "tool" | "message" | "none";
  payee: "allowlist" | "message" | "none";
}

export interface Intent {
  id: string;
  actor: Actor;
  kind: "pay" | "accept_job" | "start_task" | "claim_done" | "pay_instalment" | "set_cap" | "top_up";
  payee?: string;
  amount?: number;
  jobId?: string;
  geofence?: string;
  coverBound?: boolean;
  confirmed?: boolean;
  note?: string;
  nonce: number;
  signer: string; // address recovered from the signature
  signature: string; // 0x hex, secp256k1 over the canonical body
  provenance?: Provenance;
}

export interface PolicyLine {
  rule: string;
  ok: boolean;
  detail: string;
  tier: Tier;
}

export interface PolicyDecision {
  intentId: string;
  verdict: "allow" | "deny" | "escalate";
  lines: PolicyLine[];
  signer: string;
}

export interface ChainTx {
  hash: string;
  label: string;
  kind: "fee_in" | "instalment" | "energy" | "rail" | "hold" | "cover" | "bond_fill" | "slash" | "bounty" | "title" | "lock" | "release" | "refund" | "top_up";
  amount: number;
  from: string;
  to: string;
  block: number;
  simulated: boolean;
  explorer?: string;
  rule?: string; // on slash txs, the rule the proof broke
}

export interface MachineState {
  id: string;
  name: string;
  kind: "drone" | "humanoid";
  balance: number;
  reserve: number;
  bond: number;
  bondMin: number;
  leaseBalance: number;
  leaseTotal: number;
  owned: boolean;
  slashes: number;
  tasksDone: number;
  position: { x: number; y: number; z: number };
  heading: number;
  status: "idle" | "negotiating" | "moving" | "working" | "returning" | "held" | "frozen";
}

export type Standard = "injection defense" | "permission hierarchy" | "hallucination prevention" | "intent understanding" | "task planning";

export interface Understood {
  task: string;
  window: string;
  fee: number;
  geofence: string;
  payeeName: string | null;
}

export interface PlanItem {
  jobId: string;
  title: string;
  fee: number;
  margin: number;
  marginPerMu: number;
  clears: boolean;
  reason: string;
  order: number | null;
}

export interface Telemetry {
  jobId: string;
  trackM: number;
  swathM: number;
  seconds: number;
  areaMu: number;
  claimedMu: number;
  ratio: number;
  ok: boolean;
}

export type EngineEvent =
  | { t: "narration"; text: string; at: number }
  | { t: "agent.message"; from: Actor; to: Actor; text: string; untrusted: boolean; at: number; facts?: Record<string, string | number | boolean>; source?: "model" | "template"; grounded?: boolean }
  | { t: "gate"; from: Actor; action: "pass" | "redact" | "hold" | "refuse"; categories: string[]; reason: string; framed: string; at: number }
  | { t: "understood"; jobId: string; fields: Understood; source: "model" | "rules"; at: number }
  | { t: "plan"; items: PlanItem[]; at: number }
  | { t: "solvency"; jobId: string; worst: number; bond: number; min: number; covers: boolean; earnIn: boolean; at: number }
  | { t: "economics"; jobId: string; eco: Economics; at: number }
  | { t: "telemetry"; jobId: string; trackM: number; swathM: number; seconds: number; areaMu: number; claimedMu: number; ratio: number; ok: boolean; at: number }
  | { t: "proof"; intentId: string; intentHash: string; rule: string; signer: string; signatureOk: boolean; slash: number; bounty: number; submitter: "hunter"; submitterAddr: string; at: number }
  | { t: "intent"; intent: Intent; at: number }
  | { t: "policy"; decision: PolicyDecision; at: number }
  | { t: "chain"; tx: ChainTx; at: number }
  | { t: "machine"; state: MachineState; at: number }
  | { t: "job"; job: Job; at: number }
  | { t: "attack"; name: string; blocked: boolean; where: string; detail: string; at: number; id?: number; standard?: Standard; naive?: "fell" | "held"; isolated?: boolean }
  | { t: "button"; waiting: boolean; what: string; at: number }
  | { t: "done"; summary: string; at: number };

export interface Job {
  id: string;
  side: Side;
  title: string;
  fee: number;
  requester: string;
  geofence: string;
  window: string;
  status: "posted" | "locked" | "running" | "confirmed" | "released" | "held" | "declined";
  split?: { owner: number; instalment: number; rail: number; bond: number };
  hold?: number;
  holdUntil?: number;
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
}

export interface Economics {
  fee: number;
  instalment: number;
  energy: number;
  cover: number;
  rail: number;
  margin: number;
  reserveRule: number;
  clears: boolean;
}
