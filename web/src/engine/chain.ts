// Chain adapter. SimChain produces deterministic hashes and is labelled simulated.
// RealChain anchors each event on Base Sepolia through viem. Same interface.
// Real mode only runs when the caller proves it holds the demo token, so the funded key
// cannot be drained by anyone who finds the route.

import { keccak256, toHex } from "viem";
import type { ChainTx } from "./types";

export interface Chain {
  readonly simulated: boolean;
  send(kind: ChainTx["kind"], label: string, from: string, to: string, amount: number): Promise<ChainTx>;
}

export class SimChain implements Chain {
  readonly simulated = true;
  private block = 31_480_000 + Math.floor(Math.random() * 1000);
  private nonce = 0;
  async send(kind: ChainTx["kind"], label: string, from: string, to: string, amount: number): Promise<ChainTx> {
    this.nonce += 1;
    this.block += 1 + Math.floor(Math.random() * 2);
    const hash = keccak256(toHex(`${kind}:${label}:${from}:${to}:${amount}:${this.nonce}:${Date.now()}`));
    return { hash, label, kind, amount, from, to, block: this.block, simulated: true };
  }
}

// The real adapter sends a value transfer carrying the event as calldata and returns the
// mined hash. The label says "anchor" because the demo units are not moved on chain, the
// record of the event is. Contract calls through the ABI are the next step once the
// contracts in /contracts are deployed and their addresses are in the env.
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
  async send(kind: ChainTx["kind"], label: string, from: string, to: string, amount: number): Promise<ChainTx> {
    await this.init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = this.client as any;
    const data = toHex(JSON.stringify({ kind, label, from, to, amount }));
    const hash: `0x${string}` = await c.sendTransaction({ to: c.account.address, value: BigInt(0), data });
    const receipt = await c.waitForTransactionReceipt({ hash });
    return {
      hash,
      label: `anchor: ${label}`,
      kind,
      amount,
      from,
      to,
      block: Number(receipt.blockNumber),
      simulated: false,
      explorer: `https://sepolia.basescan.org/tx/${hash}`,
    };
  }
}

export function realChainAvailable(): boolean {
  const pk = process.env.SURETY_PRIVATE_KEY;
  return !!pk && pk.startsWith("0x") && pk.length === 66;
}

// A request is allowed real mode only when it carries the demo token.
export function demoAuthorised(headers: Headers): boolean {
  const token = process.env.DEMO_TOKEN;
  if (!token) return false;
  return headers.get("x-jixin-demo") === token;
}

export function makeChain(opts: { real?: boolean } = {}): Chain {
  const pk = process.env.SURETY_PRIVATE_KEY as `0x${string}` | undefined;
  const rpc = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
  if (opts.real && pk && realChainAvailable()) return new RealChain(pk, rpc);
  return new SimChain();
}
