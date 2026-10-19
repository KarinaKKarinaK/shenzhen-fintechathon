// Chain adapter. SimChain produces deterministic hashes and is labelled simulated.
// RealChain talks to Base Sepolia through viem when the env is set. Same interface.

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

// ponytail: the real adapter sends a value transfer carrying the event as calldata and
// returns the mined hash. Contract calls through the ABI in abi.ts are the next step once
// the contracts in /contracts are deployed and their addresses are in the env.
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
      label,
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

export function makeChain(): Chain {
  const pk = process.env.SURETY_PRIVATE_KEY as `0x${string}` | undefined;
  const rpc = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
  if (pk && pk.startsWith("0x") && pk.length === 66) return new RealChain(pk, rpc);
  return new SimChain();
}
