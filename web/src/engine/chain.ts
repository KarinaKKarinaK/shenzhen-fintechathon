// Chain adapter. SimChain produces deterministic hashes and is labelled simulated.
// RealChain anchors each event on Base Sepolia through viem. Same interface.
// FISCO BCOS (WeBank's consortium chain) is a second target through its Web3 JSON-RPC: with
// FISCO_RPC_URL, FISCO_PRIVATE_KEY and FISCO_INTENT_LOG set, every intent committed on Base is
// also committed to the IntentLog on FISCO, the lender's ledger, and the FISCO hash rides on the
// Base tx. With only FISCO set, a real run uses FISCO as its one chain. Unset, nothing changes.
// Real mode only runs when the caller proves it holds the demo token, so the funded key
// cannot be drained by anyone who finds the route.
//
// Every transaction moves through three states under one hash: pending (sent), confirmed
// (in a block) and finalised (two more blocks on top). The scenario emits the same tx at each
// step so the UI can show the state and its timestamp.

import { defineChain, keccak256, toHex, type Chain as ViemChain } from "viem";
import { CURRENCY, type ChainTx } from "./types";

export type TxExtra = Partial<Pick<ChainTx, "rule" | "bond">>;

export interface Chain {
  readonly simulated: boolean;
  send(kind: ChainTx["kind"], label: string, from: string, to: string, amount: number, extra?: TxExtra): Promise<ChainTx>;
  // Commit an intent hash to the IntentLog contract. Only the real chain has one; the simulated
  // chain's log lives in the engine mirror, so the method is absent there.
  commit?(jobId: string, intentHash: string, label: string): Promise<ChainTx>;
  confirm(tx: ChainTx): Promise<ChainTx>;
  finalise(tx: ChainTx): Promise<ChainTx>;
}

export class SimChain implements Chain {
  readonly simulated = true;
  private block = 31_480_000 + Math.floor(Math.random() * 1000);
  private nonce = 0;
  async send(kind: ChainTx["kind"], label: string, from: string, to: string, amount: number, extra: TxExtra = {}): Promise<ChainTx> {
    this.nonce += 1;
    this.block += 1 + Math.floor(Math.random() * 2);
    const hash = keccak256(toHex(`${kind}:${label}:${from}:${to}:${amount}:${this.nonce}:${Date.now()}`));
    return { hash, label, kind, amount, currency: CURRENCY, from, to, block: this.block, simulated: true, status: "pending", sentAt: Date.now(), ...extra };
  }
  async confirm(tx: ChainTx): Promise<ChainTx> {
    if (tx.status !== "pending") return tx;
    return { ...tx, status: "confirmed", confirmedAt: Date.now() };
  }
  async finalise(tx: ChainTx): Promise<ChainTx> {
    if (tx.status === "finalised") return tx;
    const confirmedAt = tx.confirmedAt ?? Date.now();
    return { ...tx, status: "finalised", confirmedAt, finalisedAt: Date.now() };
  }
}

// The real adapter sends a value transfer carrying the event as calldata and returns the
// hash as soon as the node accepts it. The label says "anchor" because the demo units are
// not moved on chain, the record of the event is. Contract calls through the ABI are the
// next step once the contracts in /contracts are deployed and their addresses are in the env.
// The IntentLog deployed on Base Sepolia (contracts/deployments/base-sepolia.json).
export const INTENT_LOG = (process.env.ZISHI_INTENT_LOG || "0x093eD0DD8E4bE4b0205a6e39d0c5988f5Cd8ad51") as `0x${string}`;
const ANCHOR_JOB = keccak256(toHex("anchor"));
const INTENT_LOG_ABI = [{ type: "function", name: "commit", stateMutability: "nonpayable", inputs: [{ name: "jobId", type: "bytes32" }, { name: "intentHash", type: "bytes32" }], outputs: [] }] as const;

// Where a RealChain sends. Base Sepolia needs two blocks on top to call a tx final; FISCO's PBFT
// is final as soon as the block commits, takes no gas price and wants legacy transactions.
export interface Net {
  name: "base-sepolia" | "fisco";
  intentLog: `0x${string}`;
  explorer: (hash: string) => string | undefined;
  instantFinal: boolean;
  txOpts: Record<string, unknown>;
  viemChain: () => Promise<ViemChain>;
}
export const BASE_SEPOLIA: Net = { name: "base-sepolia", intentLog: INTENT_LOG, explorer: (h) => `https://sepolia.basescan.org/tx/${h}`, instantFinal: false, txOpts: {}, viemChain: async () => (await import("viem/chains")).baseSepolia };

export interface FiscoConfig { rpc: string; pk: `0x${string}`; intentLog: `0x${string}`; chainId: number }
// The FISCO target is on only when all three are set and well formed.
export function fiscoConfig(env: Record<string, string | undefined> = process.env): FiscoConfig | null {
  const rpc = env.FISCO_RPC_URL, pk = env.FISCO_PRIVATE_KEY, log = env.FISCO_INTENT_LOG;
  if (!rpc || !pk || !/^0x[0-9a-fA-F]{64}$/.test(pk) || !log || !/^0x[0-9a-fA-F]{40}$/.test(log)) return null;
  return { rpc, pk: pk as `0x${string}`, intentLog: log as `0x${string}`, chainId: Number(env.FISCO_CHAIN_ID || 20200) };
}
export function fiscoNet(cfg: FiscoConfig): Net {
  return {
    name: "fisco", intentLog: cfg.intentLog, explorer: () => undefined, instantFinal: true, txOpts: { type: "legacy", gasPrice: BigInt(0) },
    viemChain: async () => defineChain({ id: cfg.chainId, name: "FISCO BCOS", nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 }, rpcUrls: { default: { http: [cfg.rpc] } } }),
  };
}

export class RealChain implements Chain {
  readonly simulated = false;
  private ready = false;
  private client: unknown;
  private seq = 0;
  constructor(private pk: `0x${string}`, private rpc: string, readonly net: Net = BASE_SEPOLIA, readonly mirror?: RealChain) {}
  private async init() {
    if (this.ready) return;
    const { createWalletClient, http, publicActions } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const account = privateKeyToAccount(this.pk);
    this.client = createWalletClient({ account, chain: await this.net.viemChain(), transport: http(this.rpc) }).extend(publicActions);
    this.ready = true;
  }
  // One wallet, many events in quick succession: sends go out one at a time with an explicit
  // pending nonce, and a nonce clash from another instance on the same key is retried.
  private queue: Promise<unknown> = Promise.resolve();
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }
  private async withNonce(fn: (nonce: number) => Promise<`0x${string}`>): Promise<`0x${string}`> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = this.client as any;
    let last: unknown;
    for (let i = 0; i < 3; i++) {
      try {
        const nonce: number = await c.getTransactionCount({ address: c.account.address, blockTag: "pending" });
        return await fn(nonce);
      } catch (e) {
        last = e;
        if (!/nonce|underpriced|replacement|already known/i.test(String((e as Error).message))) throw e;
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      }
    }
    throw last;
  }
  async send(kind: ChainTx["kind"], label: string, from: string, to: string, amount: number, extra: TxExtra = {}): Promise<ChainTx> {
    await this.init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = this.client as any;
    const body = JSON.stringify({ kind, label, from, to, amount, currency: CURRENCY, ...extra });
    // FISCO fails a call to an address without code, so a self transfer with calldata cannot carry
    // the event there. On FISCO the event's digest is committed to the IntentLog under the job id
    // keccak("anchor") instead: still one real contract call per event, just a hash, not the JSON.
    const send = this.net.name === "fisco"
      ? (nonce: number) => c.writeContract({ address: this.net.intentLog, abi: INTENT_LOG_ABI, functionName: "commit", args: [ANCHOR_JOB, keccak256(toHex(`${body}:${++this.seq}:${Date.now()}`))], nonce, ...this.net.txOpts })
      : (nonce: number) => c.sendTransaction({ to: c.account.address, value: BigInt(0), data: toHex(body), nonce, ...this.net.txOpts });
    const hash = await this.serial(() => this.withNonce(send));
    return {
      hash,
      label: `anchor: ${label}`,
      kind,
      amount,
      currency: CURRENCY,
      from,
      to,
      block: 0,
      simulated: false,
      status: "pending",
      sentAt: Date.now(),
      explorer: this.net.explorer(hash),
      network: this.net.name,
      ...extra,
    };
  }
  // IntentLog.commit(jobId, intentHash) as a real contract call. The job id is hashed to
  // bytes32 the same way the contracts tests do for string ids. A hash the log already holds
  // (the same intent from an earlier run on this key) reverts on chain, so that case falls
  // back to a calldata anchor and says so in the label.
  async commit(jobId: string, intentHash: string, label: string): Promise<ChainTx> {
    await this.init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = this.client as any;
    const log = this.net.intentLog;
    const base = { kind: "log" as const, amount: 0, currency: CURRENCY, from: c.account.address as string, to: log as string, block: 0, simulated: false, status: "pending" as const, intentHash, network: this.net.name };
    let tx: ChainTx;
    try {
      const args = [keccak256(toHex(jobId)), intentHash as `0x${string}`] as const;
      // Simulate first so a revert (a hash already in the log) costs no gas and names itself.
      await c.simulateContract({ address: log, abi: INTENT_LOG_ABI, functionName: "commit", args });
      const hash = await this.serial(() => this.withNonce((nonce) => c.writeContract({ address: log, abi: INTENT_LOG_ABI, functionName: "commit", args, nonce, ...this.net.txOpts })));
      tx = { ...base, hash, label: `IntentLog.commit: ${label}`, sentAt: Date.now(), explorer: this.net.explorer(hash) };
    } catch (e) {
      const msg = String((e as Error).message ?? "");
      const why = msg.includes("already committed") ? "already in the log" : `commit refused (${msg.split("\n")[0].slice(0, 60)})`;
      tx = { ...(await this.send("log", `${label}, ${why}, anchored`, base.from, base.to, 0)), intentHash };
    }
    // Second ledger: the same hash into FISCO's IntentLog. A FISCO failure never blocks the Base path.
    if (this.mirror) {
      try { tx = { ...tx, fiscoHash: (await this.mirror.commit(jobId, intentHash, label)).hash }; }
      catch { /* recorded as no fiscoHash */ }
    }
    return tx;
  }
  async confirm(tx: ChainTx): Promise<ChainTx> {
    if (tx.status !== "pending") return tx;
    await this.init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = this.client as any;
    const receipt = await c.waitForTransactionReceipt({ hash: tx.hash });
    return { ...tx, block: Number(receipt.blockNumber), status: "confirmed", confirmedAt: Date.now() };
  }
  async finalise(tx: ChainTx): Promise<ChainTx> {
    if (tx.status === "finalised") return tx;
    const confirmed = await this.confirm(tx);
    if (this.net.instantFinal) return { ...confirmed, status: "finalised", finalisedAt: Date.now() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = this.client as any;
    await c.waitForTransactionReceipt({ hash: tx.hash, confirmations: 2 });
    return { ...confirmed, status: "finalised", finalisedAt: Date.now() };
  }
}

export function realChainAvailable(): boolean {
  const pk = process.env.SURETY_PRIVATE_KEY;
  return !!pk && pk.startsWith("0x") && pk.length === 66;
}

// Real mode is only honest when the demo wallet holds testnet ETH. Checked at most once a minute.
let fundedCache: { at: number; funded: boolean; balanceWei: bigint } | null = null;
export async function realChainFunded(): Promise<{ funded: boolean; balanceEth: number; address?: string }> {
  if (!realChainAvailable()) return { funded: false, balanceEth: 0 };
  const now = Date.now();
  if (fundedCache && now - fundedCache.at < 60_000) return { funded: fundedCache.funded, balanceEth: Number(fundedCache.balanceWei) / 1e18 };
  try {
    const { privateKeyToAccount } = await import("viem/accounts");
    const address = privateKeyToAccount(process.env.SURETY_PRIVATE_KEY as `0x${string}`).address;
    const rpc = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }), signal: ctrl.signal });
    clearTimeout(t);
    const j = (await res.json()) as { result?: string };
    const wei = BigInt(j.result ?? "0x0");
    fundedCache = { at: now, funded: wei > BigInt(0), balanceWei: wei };
    return { funded: wei > BigInt(0), balanceEth: Number(wei) / 1e18, address };
  } catch {
    return { funded: false, balanceEth: 0 };
  }
}

// A request is allowed real mode only when it carries the demo token.
export function demoAuthorised(headers: Headers): boolean {
  const token = process.env.DEMO_TOKEN;
  if (!token) return false;
  return headers.get("x-zishi-demo") === token;
}

// Public FISCO mode: with ZISHI_PUBLIC_FISCO=1 and the FISCO target set, a visitor without the demo
// token runs on the real FISCO BCOS chain instead of the simulation. FISCO charges no gas, so each
// run signs with a fresh random key (no funds at risk, no nonce clash between runs). If the node does
// not answer within 3 seconds the run falls back to the labelled simulation.
let fiscoUp: { at: number; up: boolean } | null = null;
export async function publicFisco(): Promise<boolean> {
  const cfg = fiscoConfig();
  if (process.env.ZISHI_PUBLIC_FISCO !== "1" || !cfg) return false;
  if (fiscoUp && Date.now() - fiscoUp.at < 30_000) return fiscoUp.up;
  let up = false;
  try {
    const res = await fetch(cfg.rpc, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }), signal: AbortSignal.timeout(3000) });
    up = typeof ((await res.json()) as { result?: string }).result === "string";
  } catch { up = false; }
  fiscoUp = { at: Date.now(), up };
  return up;
}

export function makeChain(opts: { real?: boolean; fiscoOnly?: boolean } = {}): Chain {
  const pk = process.env.SURETY_PRIVATE_KEY as `0x${string}` | undefined;
  const rpc = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
  const fisco = fiscoConfig();
  if (opts.fiscoOnly && fisco) {
    const fresh = keccak256(toHex(`zishi-public-run:${Date.now()}:${Math.random()}:${Math.random()}`));
    return new RealChain(fresh, fisco.rpc, fiscoNet(fisco));
  }
  const mirror = fisco ? new RealChain(fisco.pk, fisco.rpc, fiscoNet(fisco)) : undefined;
  if (opts.real && pk && realChainAvailable()) return new RealChain(pk, rpc, BASE_SEPOLIA, mirror);
  if (opts.real && mirror) return mirror; // FISCO only: the consortium ledger is the one chain
  return new SimChain();
}
