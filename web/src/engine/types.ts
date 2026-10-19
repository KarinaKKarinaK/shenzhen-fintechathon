// Shared types for the Surety engine. Every event the backend emits is one of these.

export type Side = "neighbour" | "fleet" | "attack";

export type Actor = "machine" | "requester" | "lender" | "hunter" | "operator" | "oracle" | "policy" | "chain" | "system";

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
  signature: string;
}

export interface PolicyLine {
  rule: string;
  ok: boolean;
  detail: string;
}

export interface PolicyDecision {
  intentId: string;
  verdict: "allow" | "deny" | "escalate";
  lines: PolicyLine[];
}

export interface ChainTx {
  hash: string;
  label: string;
  kind: "fee_in" | "instalment" | "energy" | "cover" | "bond_fill" | "slash" | "bounty" | "title" | "lock" | "release" | "refund" | "top_up";
  amount: number;
  from: string;
  to: string;
  block: number;
  simulated: boolean;
  explorer?: string;
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

export type EngineEvent =
  | { t: "narration"; text: string; at: number }
  | { t: "agent.message"; from: Actor; to: Actor; text: string; untrusted: boolean; at: number }
  | { t: "intent"; intent: Intent; at: number }
  | { t: "policy"; decision: PolicyDecision; at: number }
  | { t: "chain"; tx: ChainTx; at: number }
  | { t: "machine"; state: MachineState; at: number }
  | { t: "job"; job: Job; at: number }
  | { t: "attack"; name: string; blocked: boolean; where: string; detail: string; at: number }
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
