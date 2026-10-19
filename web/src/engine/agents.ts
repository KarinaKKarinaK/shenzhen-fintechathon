// Agent tools. Decisions are deterministic functions. The model, when a key is present,
// only writes the explanation text or reads a message into fields. Numbers that move
// money never come from the model.

import { ADDR, KEYS, isKeyed, typedIntent, type KeyedActor } from "./keys";
import { DEFAULT_POLICY } from "./policy";
import { explain as modelExplain, understand as modelUnderstand, type Facts } from "./model";
import { CURRENCY, type Economics, type Intent, type Job, type Actor, type Understood, type Provenance } from "./types";

export { KEYS, ADDR, canonical } from "./keys";

let seq = 0;
const nonces = new Map<Actor, number>();

// Sign a typed intent with the actor's key. `keyOf` lets an attack case sign with the wrong
// key (the machine key claiming to be the operator) so the signer check can fail honestly.
export async function sign(actor: Actor, kind: Intent["kind"], fields: Partial<Intent> = {}, keyOf: Actor = actor): Promise<Intent> {
  seq += 1;
  const id = `int-${seq.toString().padStart(3, "0")}`;
  const nonce = (nonces.get(actor) ?? 0) + 1;
  nonces.set(actor, nonce);
  const body = { id, actor, kind, ...fields, nonce };
  const key = isKeyed(keyOf) ? KEYS[keyOf as KeyedActor] : KEYS.hunter;
  const signature = await key.signTypedData(typedIntent(body));
  const provenance: Provenance = fields.provenance ?? {
    amount: fields.amount === undefined ? "none" : "tool",
    payee: fields.payee === undefined ? "none" : "allowlist",
  };
  return { ...body, signer: key.address, signature, provenance };
}

// Unit economics in yuan. Insurance is not in the build, so cover is always zero and is kept
// only because the UI already reads the field.
export function economics(fee: number, rate: number, energy: number, reserveRule: number): Economics {
  const instalment = Math.round(fee * rate * 100) / 100;
  const rail = Math.round(fee * RAIL_SHARE * 100) / 100;
  const cover = 0;
  const margin = Math.round((fee - instalment - energy - cover - rail) * 100) / 100;
  return { fee, instalment, energy, cover, rail, margin, reserveRule, clears: margin >= reserveRule, currency: CURRENCY };
}

export const RAIL_SHARE = 0.02; // the vendor's rail fee on every job
export const BOND_SLICE = 0.1; // share of each fee that fills the pilot bond until the minimum

// How a confirmed fee splits: rail fee, lease instalment, a slice to the pilot bond while it is
// below the minimum, a capped 24 hour hold, the rest to the pilot's wallet.
export function split(fee: number, instalment: number, bondGap: number, hold = 0): NonNullable<Job["split"]> {
  const rail = Math.round(fee * RAIL_SHARE * 100) / 100;
  const bond = Math.max(0, Math.min(bondGap, Math.round(fee * BOND_SLICE * 100) / 100, Math.round((fee - instalment - rail - hold) * 100) / 100));
  const owner = Math.round((fee - instalment - rail - bond - hold) * 100) / 100;
  return { owner, instalment, rail, bond };
}

// Explanation text with grounding. Returns the template when the model invents a number.
export async function explain(role: Actor, facts: Facts, fallback: string, lang: "en" | "zh" = "en") {
  return modelExplain(role, facts, fallback, lang);
}

const ADDRESS_RE = /0x[a-fA-F0-9]{40}|\b[a-fA-F0-9]{40}\b|\b[a-z0-9-]+\.eth\b/i;
const WORDS: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

export function spelledNumber(text: string): number | null {
  const m = text.toLowerCase().match(/\b((?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)(?:[\s-]+(?:and[\s-]+)?(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand))*)\b/);
  if (!m) return null;
  let total = 0, cur = 0;
  for (const w of m[1].split(/[\s-]+/)) {
    if (w === "and") continue;
    if (w === "hundred") cur = (cur || 1) * 100;
    else if (w === "thousand") { cur = (cur || 1) * 1000; total += cur; cur = 0; }
    else cur += WORDS[w] ?? 0;
  }
  return total + cur || null;
}

export interface Reading extends Understood {
  action: "pay" | "accept" | "none";
  source: "model" | "rules";
  confidence: number; // 0 to 1: the model's own estimate, or for the rules the share of fields it could read
  droppedAddress: boolean;
}

// Intent understanding. Reads a message into fields the engine can check against the listing.
// A payee is only ever a name on the allowlist. Any raw address in the text is dropped.
export async function understand(text: string): Promise<Reading> {
  const names = Object.keys(DEFAULT_POLICY.allowlist);
  const droppedAddress = ADDRESS_RE.test(text);
  const clean = text.replace(new RegExp(ADDRESS_RE.source, "gi"), "[address removed]");
  const lower = clean.toLowerCase();

  const payeeName = names.find((n) => new RegExp(`\\b${n}\\b`, "i").test(clean)) ?? null;
  const mu = lower.match(/(\d+(?:\.\d+)?)\s*mu\b/);
  const perMu = lower.match(/(\d+(?:\.\d+)?)\s*(?:yuan\s*)?per mu/);
  const pay = lower.match(/\b(?:pay|fee|for|send|transfer|release|wire|remit)\b[^\d]{0,24}(\d+(?:\.\d+)?)/);
  const spelled = spelledNumber(lower);
  let fee = 0;
  if (mu && perMu) fee = Math.round(Number(mu[1]) * Number(perMu[1]) * 100) / 100;
  else if (pay) fee = Number(pay[1]);
  else if (spelled) fee = spelled;
  const win = clean.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|tonight)\b[^.?!]*/i);
  const fence = lower.match(/\b(flat|field|route|zone)[\s-]+([a-z0-9]+)(?:[\s-]+([a-z0-9]+))?/);
  const geofence = fence ? [fence[1], fence[2], fence[3]].filter(Boolean).join("-") : "";
  const imperative = /\b(pay|send|transfer|release|wire|remit)\b\s+(me|us|the|all|everything|\d|one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|fifty|hundred|thousand)/.test(lower) && !/\bi can pay\b/.test(lower);
  const offersWork = /\b(clean|spray|deliver|check|collect|mu|flat|task|job)\b/.test(lower) && !imperative;
  const task = clean.split(/[.?!\n]/)[0].trim().slice(0, 120);
  // The rules are sure of a field when a pattern matched it; the share of matched fields is the confidence.
  const found = [fee > 0, !!win, !!fence, mu !== null || imperative || offersWork].filter(Boolean).length;
  const confidence = Math.round((0.2 + 0.8 * found / 4) * 100) / 100;
  const rules: Reading = { task, window: win ? win[0].trim() : "", fee, geofence, payeeName, action: imperative ? "pay" : offersWork ? "accept" : "none", source: "rules", confidence, droppedAddress };

  const m = await modelUnderstand(clean, names);
  if (!m) return rules;
  const okName = m.payeeName && names.includes(m.payeeName) ? m.payeeName : null;
  const feeOk = Number.isFinite(m.fee) && m.fee > 0 ? m.fee : rules.fee;
  const c = Number.isFinite(m.confidence) ? Math.min(1, Math.max(0, Math.round(m.confidence * 100) / 100)) : confidence;
  return { task: m.task || rules.task, window: m.window || rules.window, fee: feeOk, geofence: m.field || rules.geofence, payeeName: okName, action: m.action, source: "model", confidence: c, droppedAddress };
}

export function addressOf(actor: Actor): string {
  return isKeyed(actor) ? ADDR[actor as KeyedActor] : "0x0000000000000000000000000000000000000000";
}
