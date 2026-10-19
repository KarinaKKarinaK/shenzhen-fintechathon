// Chain adapter. SimChain produces deterministic hashes and is labelled simulated.
// RealChain anchors each event on Base Sepolia through viem. Same interface.
// Real mode only runs when the caller proves it holds the demo token, so the funded key
// cannot be drained by anyone who finds the route.
//
// Every transaction moves through three states under one hash: pending (sent), confirmed
// (in a block) and finalised (two more blocks on top). The scenario emits the same tx at each
// step so the UI can show the state and its timestamp.

import { keccak256, toHex } from "viem";
import { CURRENCY, type ChainTx } from "./types";

export type TxExtra = Partial<Pick<ChainTx, "rule" | "bond">>;

export interface Chain {
  readonly simulated: boolean;
  send(kind: ChainTx["kind"], label: string, from: string, to: string, amount: number, extra?: TxExtra): Promise<ChainTx>;
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
export class RealChain implements Chain {
  readonly simulated = false;
  private ready = false;
  private client: unknown;
  constructor(private pk: `0x${string}`, private rpc: string) {}
  private async init() {
    if (this.ready) return;
    const { createWalletClient, http, publicActions } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const { baseSepolia } = await import("viem/chains");
    const account = privateKeyToAccount(this.pk);
    this.client = createWalletClient({ account, chain: baseSepolia, transport: http(this.rpc) }).extend(publicActions);
    this.ready = true;
  }
  async send(kind: ChainTx["kind"], label: string, from: string, to: string, amount: number, extra: TxExtra = {}): Promise<ChainTx> {
    await this.init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = this.client as any;
    const data = toHex(JSON.stringify({ kind, label, from, to, amount, currency: CURRENCY, ...extra }));
    const hash: `0x${string}` = await c.sendTransaction({ to: c.account.address, value: BigInt(0), data });
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
      explorer: `https://sepolia.basescan.org/tx/${hash}`,
      ...extra,
    };
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

export function makeChain(opts: { real?: boolean } = {}): Chain {
  const pk = process.env.SURETY_PRIVATE_KEY as `0x${string}` | undefined;
  const rpc = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
  if (opts.real && pk && realChainAvailable()) return new RealChain(pk, rpc);
  return new SimChain();
}
