// Runs both live scenarios fast, collects every chain and proof event, and writes
// evidence/run-<date>.json (one row per claim) plus the model transcript.
// Set SURETY_PRIVATE_KEY and JIXIN_REAL=1 to anchor on Base Sepolia, otherwise the run is simulated and says so.
// With FISCO_RPC_URL, FISCO_PRIVATE_KEY and FISCO_INTENT_LOG set too, intents also go to FISCO BCOS. With
// JIXIN_REAL=1 and only the FISCO vars, the run is on FISCO alone and lands in evidence/fisco/.

import fs from "node:fs";
import path from "node:path";
import { fleet, neighbour } from "../src/engine/scenarios";
import { transcript } from "../src/engine/model";
import { fiscoConfig, realChainAvailable } from "../src/engine/chain";
import type { ChainTx, EngineEvent, MachineState } from "../src/engine/types";

export interface EvidenceRow { claim: string; kind: ChainTx["kind"]; amount: number; from: string; to: string; hash: string; block: number; simulated: boolean; explorer: string | null; scenario: string; network?: string; intentHash?: string; fiscoHash?: string }
export interface ProofRow { scenario: string; intentId: string; intentHash: string; rule: string; signer: string; signatureOk: boolean; slash: number; bounty: number; submitterAddr: string }

async function main() {
  const real = process.env.JIXIN_REAL === "1";
  const rows: EvidenceRow[] = [];
  const proofs: ProofRow[] = [];
  const states: Record<string, { initial: MachineState | null; final: MachineState | null }> = {};
  const only = process.env.EVIDENCE_SCENARIOS?.split(","); // e.g. fleet, to keep a real run small
  for (const [name, gen] of ([["fleet", fleet], ["neighbour", neighbour]] as const).filter(([n]) => !only || only.includes(n))) {
    states[name] = { initial: null, final: null };
    for await (const ev of gen({ fast: true, real }) as AsyncGenerator<EngineEvent>) {
      if (ev.t === "machine") { if (!states[name].initial) states[name].initial = ev.state; states[name].final = ev.state; }
      if (ev.t === "chain") rows.push({ claim: ev.tx.label, kind: ev.tx.kind, amount: ev.tx.amount, from: ev.tx.from, to: ev.tx.to, hash: ev.tx.hash, block: ev.tx.block, simulated: ev.tx.simulated, explorer: ev.tx.explorer ?? null, scenario: name, network: ev.tx.network, intentHash: ev.tx.intentHash, fiscoHash: ev.tx.fiscoHash });
      if (ev.t === "proof") proofs.push({ scenario: name, intentId: ev.intentId, intentHash: ev.intentHash, rule: ev.rule, signer: ev.signer, signatureOk: ev.signatureOk, slash: ev.slash, bounty: ev.bounty, submitterAddr: ev.submitterAddr });
    }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fiscoOnly = real && !realChainAvailable() && !!fiscoConfig();
  const dir = path.join(process.cwd(), "evidence", fiscoOnly ? "fisco" : "");
  fs.mkdirSync(path.join(dir, "transcripts"), { recursive: true });
  fs.writeFileSync(path.join(dir, `run-${stamp}.json`), JSON.stringify(rows, null, 2));
  fs.writeFileSync(path.join(dir, `run-${stamp}.state.json`), JSON.stringify({ ranAt: stamp, real, states, proofs }, null, 2));
  fs.writeFileSync(path.join(dir, "transcripts", `run-${stamp}.jsonl`), transcript.map((t) => JSON.stringify(t)).join("\n") + (transcript.length ? "\n" : ""));
  const mined = rows.filter((r) => !r.simulated).length;
  const fisco = rows.filter((r) => r.fiscoHash).length;
  console.log(`${path.relative(process.cwd(), dir) || "evidence"}/run-${stamp}.json: ${rows.length} claims, ${mined} anchored on ${fiscoOnly ? "FISCO BCOS" : "Base Sepolia"}${fisco ? ` (${fisco} intents also on FISCO BCOS)` : ""}, ${rows.length - mined} simulated, ${proofs.length} proofs, ${transcript.length} model calls`);
}

main().catch((e) => { console.error(e); process.exit(1); });
