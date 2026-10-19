// Shared types for the Zishi engine. Every event the backend emits is one of these.
// All money is yuan (CNY) with at most two decimals. Every number the UI shows is yuan.

export type Side = "neighbour" | "fleet" | "attack";

export type Actor = "machine" | "requester" | "lender" | "hunter" | "operator" | "vendor" | "oracle" | "policy" | "chain" | "system";

export type Currency = "CNY";
export const CURRENCY: Currency = "CNY";

// Permission tiers. L0 reads, L1 drafts text, L2 is what the engine can allow on its own,
// L3 needs the operator key held by the physical button.
export type Tier = "L0" | "L1" | "L2" | "L3";

export interface Provenance {
  amount: "tool" | "message" | "none";
  payee: "allowlist" | "message" | "none";
}

// The typed intent the agent signs under the Zishi EIP-712 domain. jobId maps one to one to a
// JobBoard job id. `confirmed` on a claim_done intent is what the agent asserts; the contract
// checks it against the board, never against this field alone.
export interface Intent {
  id: string;
  actor: Actor;
  kind: "pay" | "accept_job" | "start_task" | "claim_done" | "pay_instalment" | "set_cap" | "top_up";
  payee?: string;
  amount?: number;
  jobId?: string;
  geofence?: string;
  confirmed?: boolean;
  note?: string;
  nonce: number;
  signer: string; // address recovered from the signature
  signature: string; // 0x hex, secp256k1 over the EIP-712 digest of the typed intent
  provenance?: Provenance;
}

export interface PolicyLine {
  rule: string; // English id, stable in code and in the event JSON
  ok: boolean;
  detail: string; // English
  detailZh?: string; // the same detail in Simplified Chinese
  tier: Tier;
}

export interface PolicyDecision {
  intentId: string;
  verdict: "allow" | "deny" | "escalate";
  lines: PolicyLine[];
  signer: string;
}

export type TxStatus = "pending" | "confirmed" | "finalised";

// A transaction is emitted up to three times under the same hash as it moves from pending to
// confirmed to finalised. The UI keys cards by hash and updates them in place.
// "cover" is kept in the union only so older UI code compiles; the engine no longer emits it.
export interface ChainTx {
  hash: string;
  label: string;
  kind: "fee_in" | "instalment" | "energy" | "rail" | "hold" | "cover" | "bond_fill" | "vendor_bond" | "slash" | "bounty" | "compensation" | "title" | "lock" | "release" | "refund" | "top_up";
  amount: number;
  currency: Currency;
  from: string;
  to: string;
  block: number;
  simulated: boolean;
  status: TxStatus;
  sentAt: number;
  confirmedAt?: number;
  finalisedAt?: number;
  explorer?: string;
  rule?: string; // on slash txs, the rule the proof broke
  bond?: BondKind; // on slash txs, which bond paid
}

export type BondKind = "pilot" | "vendor";

export interface MachineState {
  id: string;
  name: string;
  kind: "drone" | "humanoid";
  balance: number;
  reserve: number;
  bond: number; // pilot bond, earned from fees
  bondMin: number; // the reward threshold: better rate and board listing, never a start condition
  startFloor: number; // added to the pilot bond in the start check
  vendorBond: number; // posted up front by the vendor, slashed for the agent's mistakes
  currency: Currency;
  leaseBalance: number;
  leaseTotal: number;
  muDone: number; // mu sprayed under this lease so far
  muTotal: number; // mu the lease is spread over
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
  | { t: "solvency"; jobId: string; worst: number; bond: number; min: number; floor: number; covers: boolean; earnIn: boolean; at: number }
  | { t: "economics"; jobId: string; eco: Economics; at: number }
  | { t: "telemetry"; jobId: string; trackM: number; swathM: number; seconds: number; areaMu: number; claimedMu: number; ratio: number; ok: boolean; at: number }
  // The intent log: the hash is committed for the job before the policy engine decides, and the
  // full intent goes to every party listed. Blocked intents are logged too.
  | { t: "log"; jobId: string; intentHash: string; at: number; parties: string[] }
  | { t: "proof"; intentId: string; intentHash: string; rule: string; signer: string; signatureOk: boolean; slash: number; bounty: number; treasury: number; bond: BondKind; shadow: boolean; submitter: Actor; submitterAddr: string; currency: Currency; at: number }
  | { t: "intent"; intent: Intent; at: number }
  | { t: "policy"; decision: PolicyDecision; at: number }
  | { t: "chain"; tx: ChainTx; at: number }
  | { t: "machine"; state: MachineState; at: number }
  | { t: "job"; job: Job; at: number }
  | { t: "attack"; name: string; nameZh?: string; blocked: boolean; where: string; detail: string; detailZh?: string; at: number; id?: number; standard?: Standard; naive?: "fell" | "held"; isolated?: boolean }
  | { t: "button"; waiting: boolean; what: string; at: number }
  | { t: "done"; summary: string; at: number };

export interface Job {
  id: string;
  side: Side;
  title: string;
  fee: number;
  mu?: number;
  ratePerMu?: number;
  requester: string;
  geofence: string;
  window: string;
  status: "posted" | "locked" | "running" | "confirmed" | "released" | "held" | "declined";
  shadow?: boolean; // shadow jobs move no lease money and exist only for hunters
  split?: { owner: number; instalment: number; rail: number; bond: number };
  hold?: number;
  holdUntil?: number;
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
}

// Unit economics of one job in yuan. `cover` stays at zero: insurance is not in the build.
export interface Economics {
  fee: number;
  instalment: number;
  energy: number;
  cover: number;
  rail: number;
  margin: number;
  reserveRule: number;
  clears: boolean;
  currency: Currency;
}
