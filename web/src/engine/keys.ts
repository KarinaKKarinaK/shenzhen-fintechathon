// Fixed demo keys, one per actor. Derived from a label so they are stable across runs and
// obviously not real funds. The policy engine and the bond contract verify against ADDR.

import { keccak256, toHex } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import type { Actor, Intent } from "./types";

export type KeyedActor = "machine" | "operator" | "requester" | "lender" | "hunter" | "oracle";

const LABELS: KeyedActor[] = ["machine", "operator", "requester", "lender", "hunter", "oracle"];

export const KEYS: Record<KeyedActor, PrivateKeyAccount> = Object.fromEntries(
  LABELS.map((a) => [a, privateKeyToAccount(keccak256(toHex(`jixin-demo-key-${a}`)))]),
) as Record<KeyedActor, PrivateKeyAccount>;

export const ADDR: Record<KeyedActor, string> = Object.fromEntries(
  LABELS.map((a) => [a, KEYS[a].address]),
) as Record<KeyedActor, string>;

export function isKeyed(a: Actor): a is KeyedActor {
  return (LABELS as string[]).includes(a);
}

// The exact bytes an actor signs. Fixed key order, missing fields as null, so two parties
// always hash the same body for the same intent.
export function canonical(i: Pick<Intent, "id" | "actor" | "kind" | "nonce"> & Partial<Intent>): string {
  return JSON.stringify({
    id: i.id,
    actor: i.actor,
    kind: i.kind,
    payee: i.payee ?? null,
    amount: i.amount ?? null,
    jobId: i.jobId ?? null,
    geofence: i.geofence ?? null,
    coverBound: i.coverBound ?? null,
    confirmed: i.confirmed ?? null,
    nonce: i.nonce,
  });
}

export function intentHash(i: Intent): string {
  return keccak256(toHex(canonical(i)));
}
