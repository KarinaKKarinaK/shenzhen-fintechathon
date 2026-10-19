// Event sourcing for runs. Every event a run emits is appended to an in memory, hash chained
// log: each entry's hash is keccak256 over the previous hash and the canonical event, so a
// changed, dropped or reordered event breaks every hash after it. verify() recomputes the chain
// and names the first broken index. Logs are keyed by run id and capped at 200 runs.
//
// Canonical form drops the fields that change between two otherwise identical runs: wall clock
// stamps and the per process counters behind intent ids, nonces, signatures and simulated tx
// hashes. What is left is what the run did: every message, verdict, line, amount and payee.
// Two fleet runs on the same settings in fast mode therefore end on the same head, which
// the self check asserts. The dropped fields stay in the stored events; only the hash ignores them.

import { keccak256, toHex } from "viem";
import type { EngineEvent } from "../types";

export const MAX_RUNS = 200;
export const GENESIS = keccak256(toHex("zishi-replay-genesis"));

// Wall clock stamps, then the counter derived fields. "hash" is only ever a simulated or real
// tx hash in these events; intent hashes use the key intentHash and are dropped by name too.
export const VOLATILE = new Set(["at", "sentAt", "confirmedAt", "finalisedAt", "holdUntil", "block", "nonce", "signature", "hash", "intentHash", "intentId", "explorer"]);
const VOLATILE_TEXT = /\b(int-\d{3}|nonce \d+|0x[a-fA-F0-9]{64}|0x[a-fA-F0-9]{4}\.\.\.[a-fA-F0-9]{4})\b/g;

export interface Entry { seq: number; prev: string; hash: string; ev: EngineEvent }
interface RunLog { entries: Entry[] }

const runs = new Map<string, RunLog>();

// Sorted keys, volatile keys dropped, counter ids scrubbed out of free text.
export function canonical(v: unknown): string {
  return JSON.stringify(strip(v));
}

function strip(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(strip);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) {
      if (VOLATILE.has(k)) continue;
      out[k] = strip((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  if (typeof v === "string") return v.replace(VOLATILE_TEXT, (m) => (m.startsWith("0x") ? "0x" : m.startsWith("int-") ? "int-" : "nonce"));
  return v;
}

export function hashEntry(prev: string, ev: EngineEvent): string {
  return keccak256(toHex(`${prev}|${canonical(ev)}`));
}

export function append(runId: string, ev: EngineEvent): Entry {
  let log = runs.get(runId);
  if (!log) {
    if (runs.size >= MAX_RUNS) { const oldest = runs.keys().next().value; if (oldest !== undefined) runs.delete(oldest); }
    log = { entries: [] };
    runs.set(runId, log);
  }
  const prev = log.entries.length ? log.entries[log.entries.length - 1].hash : GENESIS;
  const entry: Entry = { seq: log.entries.length, prev, hash: hashEntry(prev, ev), ev };
  log.entries.push(entry);
  return entry;
}

export function chainHead(runId: string): { head: string; length: number } {
  const log = runs.get(runId);
  const n = log?.entries.length ?? 0;
  return { head: n ? log!.entries[n - 1].hash : GENESIS, length: n };
}

// Pure: recompute every hash from genesis and compare with what is stored.
export function verifyEntries(entries: Entry[]): { ok: boolean; length: number; brokenAt?: number } {
  let prev: string = GENESIS;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.prev !== prev || e.hash !== hashEntry(prev, e.ev)) return { ok: false, length: entries.length, brokenAt: i };
    prev = e.hash;
  }
  return { ok: true, length: entries.length };
}

export function verify(runId: string): { ok: boolean; length: number; brokenAt?: number } {
  const log = runs.get(runId);
  if (!log) return { ok: false, length: 0, brokenAt: 0 };
  return verifyEntries(log.entries);
}

export function replay(runId: string): EngineEvent[] {
  return (runs.get(runId)?.entries ?? []).map((e) => e.ev);
}

// Stored entries by reference, for the self check to tamper with a copy.
export function entries(runId: string): Entry[] {
  return runs.get(runId)?.entries ?? [];
}

export function listRuns(): { runId: string; head: string; length: number }[] {
  return Array.from(runs.keys()).map((runId) => ({ runId, ...chainHead(runId) })).reverse();
}

export function newRunId(prefix = "run"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
}
