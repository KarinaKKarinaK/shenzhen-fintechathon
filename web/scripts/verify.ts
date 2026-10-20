// Reads the latest evidence run, recomputes the machine balance sheet from the chain feed
// and compares it with the final machine state. For anchored hashes it fetches the
// transaction from Base Sepolia, decodes the calldata and checks kind, amount, from and to.
// Exit 1 on any mismatch.

import fs from "node:fs";
import path from "node:path";
import { createPublicClient, decodeFunctionData, hexToString, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";
import { ADDR } from "../src/engine/keys";
import type { EvidenceRow } from "./evidence";
import type { MachineState } from "../src/engine/types";
import { KEY_MODE } from "../src/engine/keys";
// The recorded run was signed with the deterministic demo keys; random keys would not match.
if (KEY_MODE !== "deterministic-demo") { console.error("set ZISHI_DETERMINISTIC_KEYS=1 (pnpm verify does) to check a recorded run"); process.exit(1); }

const COMMIT_ABI = parseAbi(["function commit(bytes32 jobId, bytes32 intentHash)"]);
const round = (n: number) => Math.round(n * 100) / 100;

async function main() {
  const dir = path.join(process.cwd(), "evidence");
  const runs = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^run-.*\.json$/.test(f) && !f.endsWith(".state.json")).sort() : [];
  if (!runs.length) { console.error("no evidence runs, run pnpm evidence first"); process.exit(1); }
  const latest = runs[runs.length - 1];
  // A real tx is recorded at each state (pending, confirmed, finalised) under one hash; keep its last row.
  const rows = [...new Map((JSON.parse(fs.readFileSync(path.join(dir, latest), "utf8")) as EvidenceRow[]).map((r) => [r.hash, r])).values()];
  const state = JSON.parse(fs.readFileSync(path.join(dir, latest.replace(/\.json$/, ".state.json")), "utf8")) as { states: Record<string, { initial: MachineState; final: MachineState }> };
  let bad = 0;
  const me = ADDR.machine.toLowerCase();

  // 1. Balance sheet per scenario from the chain feed.
  for (const [scenario, s] of Object.entries(state.states)) {
    let balance = s.initial.balance;
    for (const r of rows.filter((x) => x.scenario === scenario)) {
      if (r.to.toLowerCase() === me) balance = round(balance + r.amount);
      if (r.from.toLowerCase() === me) balance = round(balance - r.amount);
    }
    const ok = Math.abs(balance - s.final.balance) < 0.005;
    if (!ok) bad += 1;
    console.log(`${scenario}: chain feed gives ${balance}, machine state says ${s.final.balance} ${ok ? "ok" : "MISMATCH"}`);
  }

  // 2. Anchored transactions against the chain.
  const anchored = rows.filter((r) => !r.simulated);
  const table: { claim: string; kind: string; amount: number; hash: string; block: number; onChain: string }[] = [];
  if (anchored.length) {
    const client = createPublicClient({ chain: baseSepolia, transport: http(process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org") });
    for (const r of anchored) {
      let status = "ok";
      try {
        const tx = await client.getTransaction({ hash: r.hash as `0x${string}` });
        if (r.claim.startsWith("IntentLog.commit")) {
          // A contract call, not a calldata anchor: decode it and compare the committed hash.
          const { args } = decodeFunctionData({ abi: COMMIT_ABI, data: tx.input });
          if (r.intentHash && args[1].toLowerCase() !== r.intentHash.toLowerCase()) status = "HASH MISMATCH";
          if (Number(tx.blockNumber) !== r.block) status = "BLOCK MISMATCH";
          if (status !== "ok") bad += 1;
          table.push({ claim: r.claim.slice(0, 40), kind: r.kind, amount: r.amount, hash: r.hash.slice(0, 14), block: r.block, onChain: status });
          continue;
        }
        const body = JSON.parse(hexToString(tx.input)) as { kind: string; amount: number; from: string; to: string };
        if (body.kind !== r.kind || body.amount !== r.amount || body.from !== r.from || body.to !== r.to) status = "CALLDATA MISMATCH";
        if (Number(tx.blockNumber) !== r.block) status = "BLOCK MISMATCH";
      } catch (e) { status = `FETCH FAILED: ${(e as Error).message.slice(0, 40)}`; }
      if (status !== "ok") bad += 1;
      table.push({ claim: r.claim.slice(0, 40), kind: r.kind, amount: r.amount, hash: r.hash.slice(0, 14), block: r.block, onChain: status });
    }
  }
  for (const r of rows.filter((x) => x.simulated)) table.push({ claim: r.claim.slice(0, 40), kind: r.kind, amount: r.amount, hash: r.hash.slice(0, 14), block: r.block, onChain: "simulated" });
  console.table(table);
  console.log(`${latest}: ${rows.length} claims, ${anchored.length} anchored, ${bad} problems`);
  if (bad) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
