// Three agents. Decisions are deterministic tools. The model, when a key is present,
// only writes the explanation text. Numbers never come from the model.

import type { Economics, Intent, Job, Actor } from "./types";

let seq = 0;
export function sign(actor: Actor, kind: Intent["kind"], fields: Partial<Intent>): Intent {
  seq += 1;
  const id = `int-${seq.toString().padStart(3, "0")}`;
  const body = JSON.stringify({ id, actor, kind, ...fields });
  const sig = actor === "hunter" ? "forged:" : "sig:";
  return { id, actor, kind, ...fields, signature: sig + simpleHash(body) };
}

function simpleHash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

export function economics(fee: number, rate: number, energy: number, cover: number, reserveRule: number): Economics {
  const instalment = Math.round(fee * rate * 100) / 100;
  const rail = Math.round(fee * 0.02 * 100) / 100;
  const margin = Math.round((fee - instalment - energy - cover - rail) * 100) / 100;
  return { fee, instalment, energy, cover, rail, margin, reserveRule, clears: margin >= reserveRule };
}

export function split(fee: number, instalment: number, bondGap: number): NonNullable<Job["split"]> {
  const rail = Math.round(fee * 0.02 * 100) / 100;
  const bond = Math.min(bondGap, Math.round((fee - instalment - rail) * 0.5 * 100) / 100);
  const owner = Math.round((fee - instalment - rail - bond) * 100) / 100;
  return { owner, instalment, rail, bond };
}

// Explanation text. Uses the model through the AI gateway when a key exists, otherwise a template.
export async function explain(role: Actor, facts: Record<string, string | number | boolean>, fallback: string): Promise<string> {
  const key = process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) return fallback;
  try {
    const { generateText } = await import("ai");
    const { text } = await generateText({
      model: "anthropic/claude-haiku-5-5",
      system: `You are the ${role} agent in a machine wallet system. Write one plain sentence, under 25 words, explaining the decision from these facts. Do not invent numbers. No em dashes.`,
      prompt: JSON.stringify(facts),
    });
    return text.trim() || fallback;
  } catch {
    return fallback;
  }
}
