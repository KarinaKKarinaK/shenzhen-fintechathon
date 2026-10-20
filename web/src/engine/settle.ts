// Contract settlement on FISCO BCOS. When a run's chain is the real FISCO chain, the engine's money
// moments become calls to the deployed BondV2, JobBoard, Lease and IntentLogV2, with real native value,
// in the same loop: vendor bond posted, agent registered, lease opened, each job's fee locked,
// started, confirmed by the verifier (the contract splits the fee and pays the instalment to the
// lender through Lease.pay), the rogue intent committed and proven with BondV2.slashByProof, and the
// last Lease.pay moving the title. Fresh role keys per run, funded from FISCO_PRIVATE_KEY.
//
// The mirrors in contracts.ts keep their rules and state. Their sends for the kinds settled here
// go through wrap(): no anchor is sent, a marker comes back, and the Session swaps the marker for
// the contract calls queued by this class, so the feed shows each money event once.
// A failed call is queued as a narration and the run goes on. Off unless the chain is FISCO.
// FISCO quirks: block.timestamp is in milliseconds, gas price 0, legacy txs, eth_call ignores the
// sender so every send carries an explicit gas limit.

import { createPublicClient, createWalletClient, defineChain, http, keccak256, toHex, type Abi, type PublicClient } from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { RealChain, fiscoConfig, type Chain } from "./chain";
import { CURRENCY, type ChainTx, type EngineEvent } from "./types";

// 1 yuan of the demo = 1e9 wei on FISCO.
export const WEI_PER_YUAN = BigInt(1_000_000_000);
export const yuanToWei = (y: number) => BigInt(Math.round(y * 100)) * WEI_PER_YUAN / BigInt(100);

// The V2 set on the local FISCO node (contracts/deployments/fisco-v2.json): IntentLogV2 takes a commit
// only from the job's agent and keys it by (agent, hash), so nobody can front-run the agent's slot;
// BondV2.slashByProof checks that slot. Same call shapes as v1. Env overrides: FISCO_V2_INTENT_LOG,
// FISCO_V2_BOND, FISCO_V2_LEASE, FISCO_V2_JOB_BOARD. FISCO_INTENT_LOG stays the v1 anchor log of chain.ts.
export const FISCO_CONTRACTS = {
  intentLog: (process.env.FISCO_V2_INTENT_LOG || "0xA4e3313cD42eaa14Fe4b6EE627FAeF84A541eac2") as `0x${string}`,
  bond: (process.env.FISCO_V2_BOND || "0xaABE0669A13be1bDCdD7Dd16C95231d01bF8B838") as `0x${string}`,
  lease: (process.env.FISCO_V2_LEASE || "0x2f64Db2c0180D117Be883DB9E5e0aAcbed79ee08") as `0x${string}`,
  board: (process.env.FISCO_V2_JOB_BOARD || "0x89458f4bF72Fd71c8360CEFe35e148BE6C92C77b") as `0x${string}`,
};

// Kinds whose mirror send is replaced by a contract call. energy and top_up stay anchors.
export const SETTLED_KINDS = new Set<ChainTx["kind"]>(["vendor_bond", "lock", "refund", "fee_in", "rail", "hold", "instalment", "bond_fill", "title", "slash", "compensation", "bounty", "release"]);
export const SETTLED_MARK = "0x" + "0".repeat(64);

const INTENT_T = { type: "tuple", components: [
  { name: "agent", type: "address" }, { name: "kind", type: "uint8" }, { name: "payee", type: "address" }, { name: "amount", type: "uint256" },
  { name: "jobId", type: "bytes32" }, { name: "geofence", type: "bytes32" }, { name: "confirmed", type: "bool" }, { name: "nonce", type: "uint256" }, { name: "expiry", type: "uint256" },
] } as const;
const fn = (name: string, inputs: { name?: string; type: string }[], outputs: { type: string }[] = [], stateMutability = "nonpayable") =>
  ({ type: "function", name, stateMutability, inputs: inputs.map((i, k) => ({ name: i.name ?? `a${k}`, ...i })), outputs: outputs.map((o, k) => ({ name: `o${k}`, ...o })) });
const BOND_ABI = [
  fn("postVendorBond", [{ type: "uint256" }, { type: "uint256" }], [], "payable"),
  fn("register", [{ type: "address" }, { type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "address[]" }, { type: "bytes" }]),
  { ...fn("slashByProof", [{ type: "uint8" }]), inputs: [{ ...INTENT_T, name: "intent" }, { name: "signature", type: "bytes" }, { name: "rule", type: "uint8" }] },
  { ...fn("hashIntent", [], [{ type: "bytes32" }], "view"), inputs: [{ ...INTENT_T, name: "i" }] },
  { ...fn("digestOf", [], [{ type: "bytes32" }], "view"), inputs: [{ ...INTENT_T, name: "i" }] },
  fn("vendorBondOf", [{ type: "address" }], [{ type: "uint256" }], "view"),
] as unknown as Abi;
const BOARD_ABI = [
  fn("post", [{ type: "address" }, { type: "address" }, { type: "uint256" }, { type: "bytes32" }, { type: "uint64" }, { type: "uint64" }, { type: "bool" }], [{ type: "uint256" }], "payable"),
  fn("start", [{ type: "uint256" }]), fn("confirm", [{ type: "uint256" }]), fn("cancel", [{ type: "uint256" }]), fn("releaseHold", [{ type: "uint256" }]),
  fn("nextId", [], [{ type: "uint256" }], "view"), fn("held", [{ type: "uint256" }], [{ type: "uint256" }], "view"), fn("holdUntil", [{ type: "uint256" }], [{ type: "uint256" }], "view"),
] as unknown as Abi;
const LEASE_ABI = [
  fn("open", [{ type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint16" }, { type: "uint16" }, { type: "uint16" }, { type: "uint256" }], [{ type: "uint256" }]),
  fn("pay", [{ type: "uint256" }], [], "payable"),
  fn("nextId", [], [{ type: "uint256" }], "view"), fn("titleOf", [{ type: "uint256" }], [{ type: "address" }], "view"),
  fn("leases", [{ type: "uint256" }], [{ type: "address" }, { type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint16" }, { type: "uint16" }, { type: "uint16" }, { type: "uint256" }, { type: "bool" }, { type: "bool" }], "view"),
] as unknown as Abi;
const LOG_ABI = [fn("commit", [{ type: "bytes32" }, { type: "bytes32" }])] as unknown as Abi;

export type Role = "vendor" | "agent" | "lender" | "farmer" | "verifier" | "pilot";
const ROLES: Role[] = ["vendor", "agent", "lender", "farmer", "verifier", "pilot"];
const GAS = { fund: BigInt(21_000), vb: BigInt(150_000), reg: BigInt(250_000), open: BigInt(250_000), post: BigInt(250_000), start: BigInt(150_000), confirm: BigInt(350_000), commit: BigInt(150_000), slash: BigInt(250_000), pay: BigInt(150_000), cancel: BigInt(150_000), hold: BigInt(120_000) };
const GAS_MONEY = BigInt(1_000_000_000);

// One row per contract call, kept for the evidence script.
export interface SettledRow { moment: string; call: string; from: Role | "deployer"; valueWei: string; tx: string; block: number; status: "success" | "failed"; error?: string; attempt?: number }

// Recovery states of one contract call. sent -> confirmed, or failed -> retry (bounded) -> recovered,
// or, on a revert or when the retries run out, compensated (by the caller) or gave_up.
export type RecState = "sent" | "confirmed" | "failed" | "retry" | "recovered" | "compensated" | "gave_up";
export interface RecoveryRow { at: number; moment: string; call: string; state: RecState; detail: string; tx?: string }
export type Attempt = (n: number) => Promise<{ hash: string; ok: boolean; block: number }>;
export type Outcome = "confirmed" | "recovered" | "reverted" | "gave_up";

// Nonce, timeout and network errors are worth another try. A revert is the contract saying no: no retry.
export function classify(e: unknown): "retry" | "revert" {
  const m = String((e as Error)?.message ?? e);
  if (/revert|execution reverted|VM Exception|insufficient funds/i.test(m)) return "revert";
  return /nonce|timeout|timed out|network|fetch failed|ECONN|socket|EAI_AGAIN|HTTP request failed|50[234]/i.test(m) ? "retry" : "revert";
}

export async function withRecovery(call: string, attempt: Attempt, on: (s: RecState, detail: string, tx?: string) => void, o: { retries?: number; backoffMs?: number[]; sleep?: (ms: number) => Promise<void> } = {}): Promise<{ outcome: Outcome; hash?: string; attempts: number }> {
  const retries = o.retries ?? 2, backoff = o.backoffMs ?? [500, 1500];
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  for (let n = 0; ; n++) {
    on("sent", n === 0 ? "sent" : `sent again, attempt ${n + 1} of ${retries + 1}`);
    try {
      const r = await attempt(n);
      if (r.ok) { on(n === 0 ? "confirmed" : "recovered", n === 0 ? "confirmed" : `recovered on attempt ${n + 1}, tx ${r.hash.slice(0, 10)}`, r.hash); return { outcome: n === 0 ? "confirmed" : "recovered", hash: r.hash, attempts: n + 1 }; }
      on("failed", `reverted on chain, tx ${r.hash.slice(0, 10)}, no retry, compensation next`, r.hash);
      return { outcome: "reverted", hash: r.hash, attempts: n + 1 };
    } catch (e) {
      const msg = String((e as Error)?.message ?? e).split("\n")[0].slice(0, 140);
      const cls = classify(e);
      on("failed", `failed (${cls === "retry" ? "network, nonce or timeout" : "revert"}): ${msg}`);
      if (cls === "revert") return { outcome: "reverted", attempts: n + 1 };
      if (n >= retries) { on("gave_up", `gave up after ${n + 1} attempts`); return { outcome: "gave_up", attempts: n + 1 }; }
      const ms = backoff[Math.min(n, backoff.length - 1)];
      on("retry", `retry ${n + 1} of ${retries} in ${ms} ms with a fresh nonce`);
      await sleep(ms);
    }
  }
}

// Demo and test switch: ZISHI_FAULT=confirm-once (the first confirm attempt fails with a simulated
// network error before sending) or start-revert (the first job is posted with a start time after its
// window end, so JobBoard.start reverts for real and the fee is refunded through JobBoard.cancel).
export type Fault = "confirm-once" | "start-revert" | null;
export const faultFromEnv = (): Fault => { const f = process.env.ZISHI_FAULT; return f === "confirm-once" || f === "start-revert" ? f : null; };

export interface SettleTerms { vendorBond: number; penalty: number; dailyCap: number; bondMin: number; perTxCap: number; pilotSlash: number; leaseBalance: number; leaseRate: number }

export class Settlement {
  readonly rows: SettledRow[] = [];
  readonly roles: Record<Role, PrivateKeyAccount>;
  readonly deployer: PrivateKeyAccount;
  readonly pub: PublicClient;
  private queue: EngineEvent[] = [];
  private wallets = new Map<string, ReturnType<typeof createWalletClient>>();
  private chainDef;
  private jobIds = new Map<string, bigint>();
  leaseId: bigint | null = null;
  ready = false;
  readonly recovery: RecoveryRow[] = [];
  readonly fault: Fault = faultFromEnv();
  private faultUsed = false;
  readonly refunds: { jobId: string; fee: string; before: string; after: string; refunded: string; ok: boolean }[] = [];
  sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  private started = new Set<string>();
  private injected = new Set<string>();
  // Posted jobs whose start or confirm failed while the fee is still Locked: refunded by JobBoard.cancel after windowEnd.
  readonly toCancel = new Map<string, { id: bigint; windowEnd: bigint; fee: bigint; why: string }>();
  private windows = new Map<string, bigint>();
  private fees = new Map<string, bigint>();
  // Slash proofs that did not land: kept for a manual re-submit by the lender.
  readonly pendingProofs: { jobId: string; intentHash: string; intent: unknown; signature: string; rule: number }[] = [];

  constructor(private rpc: string, deployerKey: `0x${string}`, chainId: number, readonly c = FISCO_CONTRACTS) {
    this.chainDef = defineChain({ id: chainId, name: "FISCO BCOS", nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
    this.pub = createPublicClient({ chain: this.chainDef, transport: http(rpc) }) as PublicClient;
    this.deployer = privateKeyToAccount(deployerKey);
    this.roles = Object.fromEntries(ROLES.map((r) => [r, privateKeyToAccount(generatePrivateKey())])) as Record<Role, PrivateKeyAccount>;
  }

  addr(r: Role) { return this.roles[r].address; }
  contractJobId(jobId: string) { return this.jobIds.get(jobId); }

  // The mirrors' chain for this run: settled kinds return a local marker and send nothing.
  wrap(chain: Chain): Chain {
    return {
      simulated: chain.simulated,
      commit: chain.commit?.bind(chain),
      confirm: (t) => chain.confirm(t),
      finalise: (t) => chain.finalise(t),
      send: async (kind, label, from, to, amount, extra = {}) => SETTLED_KINDS.has(kind)
        ? { hash: SETTLED_MARK, label, kind, amount, currency: CURRENCY, from, to, block: 0, simulated: false, status: "finalised", sentAt: Date.now(), network: "fisco", ...extra }
        : chain.send(kind, label, from, to, amount, extra),
    };
  }

  // Everything queued since the last drain: contract txs and failure narrations.
  drain(): EngineEvent[] { const q = this.queue; this.queue = []; return q; }

  private wallet(acc: PrivateKeyAccount) {
    let w = this.wallets.get(acc.address);
    if (!w) { w = createWalletClient({ account: acc, chain: this.chainDef, transport: http(this.rpc) }); this.wallets.set(acc.address, w); }
    return w;
  }

  // One call through withRecovery: sent, confirmed or failed, bounded retries with a fresh nonce on
  // network, nonce and timeout errors, no retry on a revert. Each state goes to the feed and to recovery.
  private async call(moment: string, kind: ChainTx["kind"], label: string, who: Role | "deployer", to: `0x${string}`, gas: bigint, value: bigint, write?: { abi: Abi; functionName: string; args: readonly unknown[] }, fault?: (n: number) => void): Promise<boolean> {
    const acc = who === "deployer" ? this.deployer : this.roles[who];
    const w = this.wallet(acc);
    const short = write ? label.split(" ")[0] : label;
    let last: `0x${string}` | null = null;
    const attempt = async (n: number) => {
      fault?.(n);
      // A timed out tx may still land: look for it before sending again.
      if (last) { const prev = await this.pub.getTransactionReceipt({ hash: last }).catch(() => null); if (prev) return { hash: last, ok: prev.status === "success", block: Number(prev.blockNumber) }; }
      const nonce = n > 0 ? await this.pub.getTransactionCount({ address: acc.address, blockTag: "pending" }) : undefined;
      const opts = { account: acc, chain: this.chainDef, gas, gasPrice: BigInt(0), type: "legacy" as const, value, ...(nonce !== undefined ? { nonce } : {}) };
      const hash = write
        ? await w.writeContract({ ...opts, address: to, abi: write.abi, functionName: write.functionName, args: write.args })
        : await w.sendTransaction({ ...opts, to });
      last = hash;
      const r = await this.pub.waitForTransactionReceipt({ hash, timeout: 30_000 });
      const ok = r.status === "success";
      this.rows.push({ moment, call: label, from: who, valueWei: value.toString(), tx: hash, block: Number(r.blockNumber), status: ok ? "success" : "failed", ...(n > 0 ? { attempt: n + 1 } : {}) });
      if (write) {
        const amount = Number(value / WEI_PER_YUAN);
        this.queue.push({ t: "chain", tx: { hash, label: `Contract: ${label}${ok ? "" : " (reverted)"}${n > 0 ? ` (attempt ${n + 1})` : ""}`, kind, amount, currency: CURRENCY, from: acc.address, to, block: Number(r.blockNumber), simulated: false, status: "confirmed", sentAt: Date.now(), confirmedAt: Date.now(), network: "fisco" }, at: Date.now() });
      }
      return { hash, ok, block: Number(r.blockNumber) };
    };
    const res = await withRecovery(short, attempt, (state, detail, tx) => {
      this.recovery.push({ at: Date.now(), moment, call: short, state, detail, ...(tx ? { tx } : {}) });
      if (state === "failed" && !tx) this.rows.push({ moment, call: label, from: who, valueWei: value.toString(), tx: "none", block: 0, status: "failed", error: detail });
      if (state !== "sent" && state !== "confirmed") this.narrate(`Recovery: ${short} ${detail}`);
    }, { sleep: this.sleep });
    return res.outcome === "confirmed" || res.outcome === "recovered";
  }
  recordRecovery(moment: string, call: string, state: RecState, detail: string, tx?: string) {
    this.recovery.push({ at: Date.now(), moment, call, state, detail, ...(tx ? { tx } : {}) });
    this.narrate(`Recovery: ${call} ${detail}`);
  }
  narrate(text: string) { this.queue.push({ t: "narration", text, at: Date.now() }); }
  private fund(moment: string, r: Role, value: bigint) { return this.call(moment, "lock", `fund ${r}`, "deployer", this.addr(r), GAS.fund, value + GAS_MONEY); }
  private read<T>(address: `0x${string}`, abi: Abi, functionName: string, args: readonly unknown[] = []) {
    return this.pub.readContract({ address, abi, functionName, args }) as Promise<T>;
  }
  balance(a: `0x${string}`) { return this.pub.getBalance({ address: a }); }
  vendorBond() { return this.read<bigint>(this.c.bond, BOND_ABI, "vendorBondOf", [this.addr("vendor")]); }
  async leaseState(): Promise<{ balance: bigint; title: string } | null> {
    if (this.leaseId === null) return null;
    const l = await this.read<readonly unknown[]>(this.c.lease, LEASE_ABI, "leases", [this.leaseId]);
    return { balance: l[4] as bigint, title: await this.read<string>(this.c.lease, LEASE_ABI, "titleOf", [this.leaseId]) };
  }

  // Run start: roles funded, vendor bond posted, agent registered (pilot as operator, the lender
  // the one allowlisted payee), lease opened by the lender for what is left on the machine.
  async open(t: SettleTerms) {
    const m = "vendor bond, agent, lease";
    const vb = yuanToWei(t.vendorBond);
    let funded = true;
    for (const r of ROLES) funded = (await this.fund(m, r, r === "vendor" ? vb : BigInt(0))) && funded;
    if (!funded) return;
    await this.call(m, "vendor_bond", `BondV2.postVendorBond ${t.vendorBond} yuan (penalty ${t.penalty}, daily cap ${t.dailyCap})`, "vendor", this.c.bond, GAS.vb, vb,
      { abi: BOND_ABI, functionName: "postVendorBond", args: [yuanToWei(t.penalty), yuanToWei(t.dailyCap)] });
    await this.call(m, "vendor_bond", "BondV2.register agent (operator pilot, allowlist lender)", "agent", this.c.bond, GAS.reg, BigInt(0),
      { abi: BOND_ABI, functionName: "register", args: [this.addr("agent"), this.addr("pilot"), this.addr("vendor"), yuanToWei(t.bondMin), yuanToWei(t.perTxCap), yuanToWei(t.pilotSlash), [this.addr("lender")], "0x"] });
    const id = await this.read<bigint>(this.c.lease, LEASE_ABI, "nextId");
    const rate = Math.round(t.leaseRate * 10_000);
    if (await this.call(m, "instalment", `Lease.open ${t.leaseBalance} yuan at ${rate / 100} percent of each fee`, "lender", this.c.lease, GAS.open, BigInt(0),
      { abi: LEASE_ABI, functionName: "open", args: [this.addr("pilot"), this.addr("agent"), yuanToWei(t.leaseBalance), rate, Math.min(rate, 3000), Math.max(rate, 5000), BigInt(0)] })) {
      this.leaseId = id;
      this.ready = true;
    }
  }

  // The farmer posts the job with the fee locked in JobBoard. Window ten minutes in FISCO milliseconds.
  async post(jobId: string, fee: number, geofence: string) {
    if (!this.ready) return;
    const m = `job ${jobId} posted`;
    const v = yuanToWei(fee);
    if (!(await this.fund(m, "farmer", v))) return;
    const id = await this.read<bigint>(this.c.board, BOARD_ABI, "nextId");
    // FISCO block.timestamp is in milliseconds. Fault start-revert: start time after the window end on the first job, window 20 s.
    const inject = this.fault === "start-revert" && !this.faultUsed;
    const windowStart = inject ? BigInt(Date.now() + 3_600_000) : BigInt(0);
    const windowEnd = BigInt(Date.now() + (inject ? 20_000 : 600_000));
    if (inject) { this.injected.add(jobId); this.narrate(`Fault injection (ZISHI_FAULT=start-revert): ${jobId} is posted with a start time after its window end, so JobBoard.start will revert.`); }
    if (await this.call(m, "lock", `JobBoard.post ${jobId} fee ${fee} yuan locked`, "farmer", this.c.board, GAS.post, v,
      { abi: BOARD_ABI, functionName: "post", args: [this.addr("agent"), this.addr("verifier"), this.leaseId, keccak256(toHex(geofence)), windowStart, windowEnd, false] })) { this.jobIds.set(jobId, id); this.windows.set(jobId, windowEnd); this.fees.set(jobId, v); }
  }
  // A failed start leaves the fee Locked: JobBoard.cancel by the farmer refunds it after windowEnd.
  private scheduleCancel(jobId: string, why: string) {
    const id = this.jobIds.get(jobId); if (id === undefined || this.toCancel.has(jobId)) return;
    this.toCancel.set(jobId, { id, windowEnd: this.windows.get(jobId) ?? BigInt(0), fee: this.fees.get(jobId) ?? BigInt(0), why });
    this.recordRecovery(`job ${jobId}`, "JobBoard.cancel", "retry", `scheduled: ${why}; the fee stays Locked and JobBoard.cancel refunds the farmer after the window ends at ${new Date(Number(this.windows.get(jobId) ?? 0)).toISOString()}`);
  }
  async start(jobId: string) {
    const id = this.jobIds.get(jobId); if (id === undefined) return;
    if (this.injected.has(jobId)) this.faultUsed = true;
    if (await this.call(`job ${jobId} started`, "lock", `JobBoard.start ${jobId}`, "agent", this.c.board, GAS.start, BigInt(0), { abi: BOARD_ABI, functionName: "start", args: [id] })) this.started.add(jobId);
    else this.scheduleCancel(jobId, `JobBoard.start failed for ${jobId}`);
  }
  // The verifier confirms; the contract pays the rail fee, the instalment through Lease.pay, the bond gap and the agent.
  async confirm(jobId: string) {
    const id = this.jobIds.get(jobId); if (id === undefined) return;
    if (!this.started.has(jobId)) { this.narrate(`Recovery: JobBoard.confirm for ${jobId} skipped, the job never started on FISCO; the refund is pending through JobBoard.cancel.`); return; }
    const fault = (n: number) => {
      if (this.fault === "confirm-once" && n === 0 && !this.faultUsed) { this.faultUsed = true; throw new Error("simulated network error: fetch failed (ZISHI_FAULT=confirm-once)"); }
    };
    const ok = await this.call(`job ${jobId} confirmed`, "instalment", `JobBoard.confirm ${jobId}, fee split by the contract, instalment to the lender through Lease.pay`, "verifier", this.c.board, GAS.confirm, BigInt(0), { abi: BOARD_ABI, functionName: "confirm", args: [id] }, fault);
    // The job is Running: JobBoard has no refund for a started job, so cancel cannot run. The verifier re-submits confirm.
    if (!ok) this.recordRecovery(`job ${jobId} confirmed`, "JobBoard.confirm", "gave_up", `not settled for ${jobId}: the job is Running, so JobBoard.cancel cannot refund it; the fee stays in JobBoard until the verifier re-submits confirm. Lender alerted: no instalment from this job yet.`);
  }
  // End of run: refund every job whose start failed. Waits up to 30 s for a window that is about to close.
  async compensate() {
    for (const [jobId, c] of this.toCancel) {
      const left = Number(c.windowEnd) - Date.now();
      if (left > 30_000) { this.recordRecovery(`job ${jobId}`, "JobBoard.cancel", "retry", `window still open for ${Math.round(left / 1000)} s; the farmer calls JobBoard.cancel after ${new Date(Number(c.windowEnd)).toISOString()} to get ${c.fee} wei back`); continue; }
      if (left > -3000) await this.sleep(left + 3000);
      const before = await this.balance(this.addr("farmer"));
      const ok = await this.call(`job ${jobId} refund`, "refund", `JobBoard.cancel ${jobId}, fee refunded to the farmer`, "farmer", this.c.board, GAS.cancel, BigInt(0), { abi: BOARD_ABI, functionName: "cancel", args: [c.id] });
      const after = await this.balance(this.addr("farmer"));
      this.toCancel.delete(jobId);
      const tx = this.rows[this.rows.length - 1]?.tx;
      if (ok) this.recordRecovery(`job ${jobId}`, "JobBoard.cancel", "compensated", `farmer refunded ${after - before} wei of the ${c.fee} wei fee (${c.why})`, tx);
      else this.recordRecovery(`job ${jobId}`, "JobBoard.cancel", "gave_up", `refund not sent; the farmer can call JobBoard.cancel on job ${c.id} again`);
      this.refunds.push({ jobId, fee: c.fee.toString(), before: before.toString(), after: after.toString(), refunded: (after - before).toString(), ok: ok && after - before === c.fee });
    }
  }
  // Declined or held: JobBoard.cancel only refunds after the window ends, so the fee stays locked and the feed says so.
  async keepLocked(jobId: string, why: string, started = false) {
    if (this.jobIds.get(jobId) === undefined) return;
    if (!started) this.scheduleCancel(jobId, `${jobId} ${why}`);
    this.narrate(`On FISCO the fee for ${jobId} stays locked in JobBoard (${why}, no confirm). ${started ? "The job was started, so only the verifier's confirm releases it." : "JobBoard.cancel refunds the farmer once the ten minute window ends."}`);
  }

  // The rogue intent: signed by the agent key under the contract's own digest, committed to the
  // IntentLogV2 by the agent under its own JobBoard job id (V2 rejects anyone else), proven by the lender with rule PayeeNotAllowlisted. The vendor bond pays.
  async slash(jobId: string, payee: string, amount: number) {
    const id = this.jobIds.get(jobId); if (id === undefined) { this.narrate(`No contract job for ${jobId}, the proof is not sent on FISCO.`); return; }
    const m = `rogue intent on ${jobId} proven`;
    try {
      const intent = { agent: this.addr("agent"), kind: 4, payee: payee.toLowerCase() as `0x${string}`, amount: yuanToWei(amount), jobId: toHex(id, { size: 32 }), geofence: keccak256(toHex("field-north")), confirmed: false, nonce: BigInt(Date.now()), expiry: BigInt(Date.now() + 86_400_000) };
      const ih = await this.read<`0x${string}`>(this.c.bond, BOND_ABI, "hashIntent", [intent]);
      const dg = await this.read<`0x${string}`>(this.c.bond, BOND_ABI, "digestOf", [intent]);
      const sig = await this.roles.agent.sign({ hash: dg });
      if (!(await this.call(m, "log", `IntentLogV2.commit rogue intent ${ih.slice(0, 10)} for ${jobId}`, "agent", this.c.intentLog, GAS.commit, BigInt(0), { abi: LOG_ABI, functionName: "commit", args: [intent.jobId, ih] }))) return;
      if (!(await this.call(m, "slash", `BondV2.slashByProof PayeeNotAllowlisted, vendor bond pays the treasury`, "lender", this.c.bond, GAS.slash, BigInt(0), { abi: BOND_ABI, functionName: "slashByProof", args: [intent, sig, 0] }))) {
        // No money moves. The signed intent and its commit stay valid, so the lender can re-submit the same proof.
        this.pendingProofs.push({ jobId, intentHash: ih, intent: { ...intent, amount: intent.amount.toString(), nonce: intent.nonce.toString(), expiry: intent.expiry.toString() }, signature: sig, rule: 0 });
        this.recordRecovery(m, "BondV2.slashByProof", "gave_up", `proof ${ih.slice(0, 10)} recorded for a manual re-submit, no money moved. Lender alerted.`);
      }
    } catch (e) { this.narrate(`Proof on FISCO not sent: ${String((e as Error).message).split("\n")[0].slice(0, 120)}`); }
  }
  // The last instalment: if the contract lease still has a balance, the pilot pays it and the title moves.
  async title() {
    const s = await this.leaseState().catch(() => null); if (!s) return;
    if (s.balance > BigInt(0)) {
      if (!(await this.fund("title", "pilot", s.balance))) return;
      if (!(await this.call("title", "title", `Lease.pay ${s.balance} wei by the pilot, title moves to the pilot`, "pilot", this.c.lease, GAS.pay, s.balance, { abi: LEASE_ABI, functionName: "pay", args: [this.leaseId] })))
        this.recordRecovery("title", "Lease.pay", "gave_up", `final payment not settled: the title stays with the lender and the balance stays ${s.balance} wei. Lender alerted.`);
    }
    const after = await this.leaseState().catch(() => null);
    if (after) this.narrate(`On FISCO Lease ${this.leaseId} balance is ${after.balance} wei and titleOf is ${after.title.toLowerCase() === this.addr("pilot").toLowerCase() ? "the pilot" : after.title}.`);
  }
  // Holds release after HOLD_SECONDS, which on FISCO is 86.4 s of milliseconds. Released if due, else said so.
  async releaseHolds() {
    await this.compensate();
    for (const [jobId, id] of this.jobIds) {
      const held = await this.read<bigint>(this.c.board, BOARD_ABI, "held", [id]).catch(() => BigInt(0));
      if (held === BigInt(0)) continue;
      const until = await this.read<bigint>(this.c.board, BOARD_ABI, "holdUntil", [id]).catch(() => BigInt(0));
      if (BigInt(Date.now()) > until + BigInt(3000)) await this.call(`hold ${jobId} released`, "release", `JobBoard.releaseHold ${jobId}`, "agent", this.c.board, GAS.hold, BigInt(0), { abi: BOARD_ABI, functionName: "releaseHold", args: [id] });
      else this.narrate(`On FISCO the hold of ${held} wei for ${jobId} stays in JobBoard until ${new Date(Number(until)).toISOString()}, then the agent calls releaseHold.`);
    }
  }
}

// On only when the run's chain is the real FISCO chain and the deployer key is set. ZISHI_FISCO_SETTLE=0 turns it off.
export function makeSettlement(chain: Chain): Settlement | null {
  if (process.env.ZISHI_FISCO_SETTLE === "0") return null;
  if (!(chain instanceof RealChain) || chain.net.name !== "fisco") return null;
  const cfg = fiscoConfig();
  if (!cfg) return null;
  return new Settlement(cfg.rpc, cfg.pk, cfg.chainId);
}
