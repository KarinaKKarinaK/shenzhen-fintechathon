// Fixed demo keys, one per actor. Derived from a label so they are stable across runs and
// obviously not real funds. The policy engine and the bond contract verify against ADDR.
// Intents are signed under the JiXin EIP-712 domain so the same digest can be checked on chain.

import { hashTypedData, keccak256, recoverTypedDataAddress, toHex, type TypedDataDefinition } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import type { Actor, Intent } from "./types";

export type KeyedActor = "machine" | "operator" | "requester" | "lender" | "hunter" | "vendor" | "oracle";

const LABELS: KeyedActor[] = ["machine", "operator", "requester", "lender", "hunter", "vendor", "oracle"];

export const KEYS: Record<KeyedActor, PrivateKeyAccount> = Object.fromEntries(
  LABELS.map((a) => [a, privateKeyToAccount(keccak256(toHex(`jixin-demo-key-${a}`)))]),
) as Record<KeyedActor, PrivateKeyAccount>;

export const ADDR: Record<KeyedActor, string> = Object.fromEntries(
  LABELS.map((a) => [a, KEYS[a].address]),
) as Record<KeyedActor, string>;

export function isKeyed(a: Actor): a is KeyedActor {
  return (LABELS as string[]).includes(a);
}

// The EIP-712 domain. Base Sepolia, the chain the contracts in /contracts deploy to.
export const DOMAIN = { name: "JiXin", version: "1", chainId: 84532 } as const;

// Field order matches IBonded.Intent. Amounts are yuan with two decimals carried as a string,
// ids as strings; the on-chain struct uses bytes32 and uint256 fen, mapped by the adapter.
export const INTENT_TYPES = {
  Intent: [
    { name: "id", type: "string" },
    { name: "actor", type: "string" },
    { name: "kind", type: "string" },
    { name: "payee", type: "string" },
    { name: "amount", type: "string" },
    { name: "jobId", type: "string" },
    { name: "geofence", type: "string" },
    { name: "confirmed", type: "bool" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export type IntentBody = Pick<Intent, "id" | "actor" | "kind" | "nonce"> & Partial<Intent>;

// The exact fields an actor signs. Missing fields are empty, so two parties always hash the
// same struct for the same intent.
export function typedIntent(i: IntentBody): TypedDataDefinition<typeof INTENT_TYPES, "Intent"> {
  return {
    domain: DOMAIN,
    types: INTENT_TYPES,
    primaryType: "Intent",
    message: {
      id: i.id,
      actor: i.actor,
      kind: i.kind,
      payee: i.payee ?? "",
      amount: i.amount === undefined ? "" : String(i.amount),
      jobId: i.jobId ?? "",
      geofence: i.geofence ?? "",
      confirmed: i.confirmed ?? false,
      nonce: BigInt(i.nonce),
    },
  };
}

// Kept for the message gate and older callers: a stable JSON form of the signed fields.
export function canonical(i: IntentBody): string {
  const m = typedIntent(i).message;
  return JSON.stringify({ ...m, nonce: Number(m.nonce) });
}

// The EIP-712 digest of the intent. This is what the log commits and what a proof points at.
export function intentHash(i: IntentBody): string {
  return hashTypedData(typedIntent(i));
}

// Recovers the signer of a typed intent. The zero address when the signature does not parse.
export async function recoverSigner(i: IntentBody & { signature: string }): Promise<string> {
  try {
    return await recoverTypedDataAddress({ ...typedIntent(i), signature: i.signature as `0x${string}` });
  } catch {
    return "0x0000000000000000000000000000000000000000";
  }
}
