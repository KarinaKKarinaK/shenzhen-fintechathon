// One signing key per actor. The policy engine and the bond contract verify against ADDR.
//
// Default mode, "random-per-process": each actor's private key comes from a CSPRNG
// (viem generatePrivateKey, which uses crypto.getRandomValues) once when this module loads.
// The keys live only in this process's memory. They are never logged, never returned by any
// API and never sent to the client, and nobody can derive them from public data. Only the
// addresses are public (see GET /api/keys). A new server instance gets new keys.
//
// Opt in mode, "deterministic-demo": with ZISHI_DETERMINISTIC_KEYS=1 each key is keccak256 of
// the public label "zishi-demo-key-<actor>". Anyone can derive these, so they are for tests,
// replay checks and evidence reproduction only (pnpm test, evidence, verify, verify:all and
// fisco set the flag), where two runs must give the same signatures and the same intent hashes
// on Base Sepolia and FISCO BCOS. Never use this mode on a public deployment.
// Intents are signed under the Zishi EIP-712 domain so the same digest can be checked on chain.

import { hashTypedData, keccak256, recoverTypedDataAddress, toHex, type TypedDataDefinition } from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import type { Actor, Intent } from "./types";

export type KeyedActor = "machine" | "operator" | "requester" | "lender" | "hunter" | "vendor" | "oracle";
export type KeyMode = "random-per-process" | "deterministic-demo";

const LABELS: KeyedActor[] = ["machine", "operator", "requester", "lender", "hunter", "vendor", "oracle"];

// The public label derivation. Only used when the opt in flag is set, and by the selfcheck to
// prove the default keys are not these.
export function deriveDemoKey(a: KeyedActor): `0x${string}` {
  return keccak256(toHex(`zishi-demo-key-${a}`));
}

export function buildKeys(mode: KeyMode): Record<KeyedActor, PrivateKeyAccount> {
  return Object.fromEntries(
    LABELS.map((a) => [a, privateKeyToAccount(mode === "deterministic-demo" ? deriveDemoKey(a) : generatePrivateKey())]),
  ) as Record<KeyedActor, PrivateKeyAccount>;
}

export const KEY_MODE: KeyMode =
  typeof process !== "undefined" && process.env?.ZISHI_DETERMINISTIC_KEYS === "1" ? "deterministic-demo" : "random-per-process";

export const KEY_NOTE: Record<KeyMode, string> = {
  "random-per-process": "Actor keys are random per server instance: generated from a CSPRNG at start, held only in memory, never logged or sent to the client. Only the addresses are public.",
  "deterministic-demo": "Deterministic demo keys (ZISHI_DETERMINISTIC_KEYS=1): each key is keccak256 of a public label, so anyone can derive it. Tests and evidence reproduction only.",
};

export const KEYS: Record<KeyedActor, PrivateKeyAccount> = buildKeys(KEY_MODE);

export const ADDR: Record<KeyedActor, string> = Object.fromEntries(
  LABELS.map((a) => [a, KEYS[a].address]),
) as Record<KeyedActor, string>;

// The public view: mode and addresses, never a key.
export function publicKeyInfo() {
  return { mode: KEY_MODE, note: KEY_NOTE[KEY_MODE], addresses: { ...ADDR } };
}

export function isKeyed(a: Actor): a is KeyedActor {
  return (LABELS as string[]).includes(a);
}

// The EIP-712 domain. Base Sepolia, the chain the contracts in /contracts deploy to.
export const DOMAIN = { name: "Zishi", version: "1", chainId: 84532 } as const;

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
