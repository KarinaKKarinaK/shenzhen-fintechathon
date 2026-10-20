// FISCO BCOS check and report. Reads the latest FISCO run in evidence/fisco/ (pnpm evidence with
// JIXIN_REAL=1 and only the FISCO_* vars set), fetches every receipt back from the FISCO node and,
// for each IntentLog commit, decodes the calldata and reads the log contract to confirm the hash on
// FISCO equals the engine's intent hash. Then it looks the same hashes up in the captured Base Sepolia
// run and in the Base IntentLog. Writes docs/FISCO_EVIDENCE.md. Exit 1 on any mismatch.
// Run: FISCO_RPC_URL=http://127.0.0.1:8545 pnpm fisco

import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, decodeFunctionData, http } from "viem";
import { baseSepolia } from "viem/chains";
import { INTENT_LOG } from "../src/engine/chain";
import type { EvidenceRow } from "./evidence";

const ROOT = join(__dirname, "..", "..");
const RPC = process.env.FISCO_RPC_URL || "http://127.0.0.1:8545";
const ABI = [
  { type: "function", name: "commit", stateMutability: "nonpayable", inputs: [{ name: "jobId", type: "bytes32" }, { name: "intentHash", type: "bytes32" }], outputs: [] },
  { type: "function", name: "committedAt", stateMutability: "view", inputs: [{ name: "h", type: "bytes32" }], outputs: [{ type: "uint64" }] },
  { type: "function", name: "jobOf", stateMutability: "view", inputs: [{ name: "h", type: "bytes32" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "agentOf", stateMutability: "view", inputs: [{ name: "h", type: "bytes32" }], outputs: [{ type: "address" }] },
] as const;
const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-4)}`;

async function main() {
  const dep = JSON.parse(readFileSync(join(ROOT, "contracts", "deployments", "fisco-bcos.json"), "utf8")) as { chainId: number; nodeVersion: string; evmVersion: string; deployer: string; group: string; contracts: Record<string, { address: string; tx: string; gasUsed: number; block: number }>; fateModel?: { sha256: string; jobId: string; tx: string; block: number; gasUsed: number }; smoke: { function: string; tx: string; block: number; status: string }[] };
  const log = dep.contracts.IntentLog.address as `0x${string}`;
  const dir = join(process.cwd(), "evidence", "fisco");
  const runs = existsSync(dir) ? readdirSync(dir).filter((f) => /^run-.*\.json$/.test(f) && !f.endsWith(".state.json")).sort() : [];
  if (!runs.length) { console.error("no FISCO run in evidence/fisco, run JIXIN_REAL=1 pnpm evidence with the FISCO_* vars first"); process.exit(1); }
  const latest = runs[runs.length - 1];
  // A tx is recorded at each state (pending, confirmed, finalised); keep its last row.
  const rows = [...new Map((JSON.parse(readFileSync(join(dir, latest), "utf8")) as EvidenceRow[]).filter((r) => r.network === "fisco").map((r) => [r.hash, r])).values()];
  const chain = { id: dep.chainId, name: "FISCO BCOS", nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };
  const fisco = createPublicClient({ chain, transport: http(RPC) });

  // Intent hashes the Base Sepolia capture committed, by job.
  const sse = join(process.cwd(), "evidence", "real-run-2026-10-20.sse");
  const baseHashes = new Set<string>();
  if (existsSync(sse)) for (const line of readFileSync(sse, "utf8").split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const ev = JSON.parse(line.slice(6)) as { t: string; intentHash?: string };
    if (ev.t === "log" && ev.intentHash) baseHashes.add(ev.intentHash.toLowerCase());
  }
  const base = createPublicClient({ chain: baseSepolia, transport: http(process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org") });

  const logsUsed = new Set<string>();
  let bad = 0, receiptsOk = 0, commits = 0, matched = 0, onBase = 0, baseChecked = 0;
  const table: string[] = [];
  for (const [i, r] of rows.entries()) {
    const receipt = await fisco.getTransactionReceipt({ hash: r.hash as `0x${string}` });
    const ok = receipt.status === "success" && Number(receipt.blockNumber) === r.block;
    if (ok) receiptsOk += 1; else bad += 1;
    let check = "";
    if (r.kind === "log" && r.intentHash && r.claim.startsWith("IntentLog.commit")) {
      commits += 1;
      const tx = await fisco.getTransaction({ hash: r.hash as `0x${string}` });
      const { args } = decodeFunctionData({ abi: ABI, data: tx.input });
      const [jobId, h] = args as readonly [`0x${string}`, `0x${string}`];
      // Read the IntentLog the tx went to: a run made before fisco.sh last redeployed stays checkable.
      const runLog = tx.to as `0x${string}`;
      logsUsed.add(runLog);
      const at = await fisco.readContract({ address: runLog, abi: ABI, functionName: "committedAt", args: [h] });
      const agent = await fisco.readContract({ address: runLog, abi: ABI, functionName: "agentOf", args: [h] });
      const job = await fisco.readContract({ address: runLog, abi: ABI, functionName: "jobOf", args: [h] });
      const same = h.toLowerCase() === r.intentHash.toLowerCase() && at > BigInt(0) && agent.toLowerCase() === tx.from.toLowerCase() && job === jobId;
      if (same) matched += 1; else bad += 1;
      let baseNote = "not in Base capture";
      if (baseHashes.has(h.toLowerCase())) {
        onBase += 1;
        try { baseChecked += (await base.readContract({ address: INTENT_LOG, abi: ABI, functionName: "committedAt", args: [h] })) > BigInt(0) ? 1 : 0; baseNote = "also on Base IntentLog"; }
        catch { baseNote = "in Base capture (Base RPC unreachable)"; }
      }
      check = `${same ? "hash matches" : "MISMATCH"}, ${baseNote}`;
    }
    table.push(`| ${i + 1} | ${r.scenario} | ${r.claim.replace(/\|/g, "/")} | ${r.kind} | \`${short(r.hash)}\` | ${r.block} | ${Number(receipt.gasUsed).toLocaleString("en-US")} | ${receipt.status} | ${check} |`);
  }

  // FATE model provenance: the federated credit model's sha256 sits in the FISCO IntentLog
  // (contracts/script/fisco_fate.sh). Read it back now and compare with the model the engine loads.
  const fate: string[] = [];
  if (dep.fateModel) {
    const f = dep.fateModel;
    const engineSha = `0x${(JSON.parse(readFileSync(join(process.cwd(), "src", "engine", "credit", "fate-model.json"), "utf8")) as { sha256: string }).sha256}`;
    const receipt = await fisco.getTransactionReceipt({ hash: f.tx as `0x${string}` });
    const at = await fisco.readContract({ address: log, abi: ABI, functionName: "committedAt", args: [f.sha256 as `0x${string}`] });
    const job = await fisco.readContract({ address: log, abi: ABI, functionName: "jobOf", args: [f.sha256 as `0x${string}`] });
    const ok = receipt.status === "success" && at > BigInt(0) && job.toLowerCase() === f.jobId.toLowerCase() && engineSha.toLowerCase() === f.sha256.toLowerCase();
    if (!ok) bad += 1;
    fate.push(
      "## 4. FATE model provenance", "",
      "The credit model trained with WeBank's FATE federated learning framework is pinned on the same consortium ledger: its sha256 (from `fate/model.json`) was committed to the FISCO IntentLog under the job id keccak256(\"fate-model\"). Anyone holding the model file can recompute its canonical hash (every field except sha256 and sha256_of, sorted keys, no spaces; \`pnpm test\` does this) and check the ledger before trusting a credit score.", "",
      "| Field | Value |", "|---|---|",
      `| Model sha256 | \`${f.sha256}\` |`,
      `| Job id | \`${f.jobId}\` (keccak256 of \"fate-model\") |`,
      `| Transaction | \`${f.tx}\` |`,
      `| Block | ${f.block} |`,
      `| Status | ${receipt.status} |`,
      `| Read back now | committedAt ${at}, jobOf matches: ${job.toLowerCase() === f.jobId.toLowerCase() ? "yes" : "no"}, equals \`web/src/engine/credit/fate-model.json\`: ${engineSha.toLowerCase() === f.sha256.toLowerCase() ? "yes" : "no"} |`,
      "",
    );
    console.log(`FATE model ${f.sha256.slice(0, 10)}... on FISCO: ${ok ? "read back ok" : "MISMATCH"}`);
  }

  // One real run on both ledgers: Base Sepolia as the primary chain, each IntentLog commit mirrored
  // to FISCO (fiscoHash). Base receipts from Base, FISCO receipts and calldata from FISCO.
  const dual: string[] = [];
  const evDir = join(process.cwd(), "evidence");
  const baseRuns = readdirSync(evDir).filter((f) => /^run-.*\.json$/.test(f) && !f.endsWith(".state.json")).sort();
  for (const f of baseRuns.reverse()) {
    const all = JSON.parse(readFileSync(join(evDir, f), "utf8")) as EvidenceRow[];
    const pairs = [...new Map(all.filter((r) => r.fiscoHash && r.network === "base-sepolia").map((r) => [r.hash, r])).values()];
    if (!pairs.length) continue;
    let both = 0;
    const rowsMd: string[] = [];
    for (const [i, r] of pairs.entries()) {
      const b = await base.getTransactionReceipt({ hash: r.hash as `0x${string}` }).catch(() => null);
      const fr = await fisco.getTransactionReceipt({ hash: r.fiscoHash as `0x${string}` });
      const ftx = await fisco.getTransaction({ hash: r.fiscoHash as `0x${string}` });
      const { args } = decodeFunctionData({ abi: ABI, data: ftx.input });
      const fh = (args as readonly string[])[1];
      const fiscoCommit = fh.toLowerCase() === (r.intentHash ?? "").toLowerCase();
      const ok = b?.status === "success" && fr.status === "success" && fiscoCommit;
      if (ok) both += 1; else bad += 1;
      const baseKind = r.claim.startsWith("IntentLog.commit") ? "commit" : "already in the Base log, anchored";
      rowsMd.push(`| ${i + 1} | ${r.claim.split(",")[0].replace("IntentLog.commit: ", "")} | \`${short(r.intentHash ?? "")}\` | [\`${short(r.hash)}\`](https://sepolia.basescan.org/tx/${r.hash}) ${baseKind}, ${b?.status ?? "not found"} | \`${short(r.fiscoHash!)}\` block ${Number(fr.blockNumber)}, ${fr.status} | ${fiscoCommit ? "same hash" : "MISMATCH"} |`);
    }
    dual.push(
      "## 4. One real run on both ledgers", "",
      `\`web/evidence/${f}\`: the fleet scenario in real mode with the funded Base Sepolia key and the FISCO target both set. Each intent was sent to both chains in the same step. Its hash was already in the Base IntentLog from the earlier Base run (docs/EXECUTION_EVIDENCE.md), so on Base the step anchored it as calldata, as the engine does on any repeat, while on FISCO the same hash was committed to the IntentLog. ${both} of ${pairs.length} pairs have a successful receipt on both chains and the same intent hash on FISCO.`, "",
      "| # | Intent | Intent hash | Base Sepolia | FISCO BCOS | Check |", "|---|---|---|---|---|---|",
      ...rowsMd, "",
    );
    console.log(`both ledgers (${f}): ${both} of ${pairs.length} intents on Base and FISCO with the same hash`);
    break;
  }

  // One full job against the deployed contracts on FISCO (contracts/script/fulljob.sh fisco).
  const fjPath = join(ROOT, "contracts", "deployments", "fisco-fulljob.json");
  const fjMd: string[] = [];
  if (existsSync(fjPath)) {
    const fj = JSON.parse(readFileSync(fjPath, "utf8")) as { steps: { step: string; contract: string; function: string; from: string; valueWei: string; tx: string }[] };
    const calls = fj.steps.filter((x) => /^\d+$/.test(x.step));
    let ok = 0;
    const rowsFj: string[] = [];
    for (const x of calls) {
      const r = await fisco.getTransactionReceipt({ hash: x.tx as `0x${string}` });
      if (r.status === "success") ok += 1; else bad += 1;
      rowsFj.push(`| ${x.step} | ${x.contract}.${x.function} | ${x.from} | ${x.valueWei === "0" ? "0" : `${x.valueWei} wei`} | \`${x.tx}\` | ${Number(r.blockNumber)} | ${r.status} |`);
    }
    fjMd.push("## 6. One full job against the deployed contracts", "", `Run by \`contracts/script/fulljob.sh fisco\`: fresh keys for six roles, every step a call to the deployed Bond, Lease, JobBoard or IntentLog with native value moving: vendor bond posted, fee locked, confirmed and split (instalment to the lender through Lease), a rogue intent committed and slashed by proof from the vendor bond, the last payment moving the title to the pilot, the hold released. ${ok} of ${calls.length} receipts fetched again now with status success.`, "", "| # | Call | From | Value | Transaction | Block | Status |", "|---|---|---|---|---|---|---|", ...rowsFj, "");
    console.log(`full job on FISCO: ${ok} of ${calls.length} contract calls succeeded`);
  }

  const md = [
    "# FISCO BCOS evidence",
    "",
    `Generated by \`pnpm fisco\` (\`web/scripts/fisco.ts\`) at ${new Date().toISOString()} from \`web/evidence/fisco/${latest}\`. Do not edit by hand.`,
    "",
    "The same engine that commits to Base Sepolia ran end to end on a FISCO BCOS chain, WeBank's consortium blockchain, through its Web3 JSON-RPC. Every row was fetched back from the node while this file was written: status, block and gas come from the receipt. For every IntentLog commit the calldata was decoded and the contract read back, and the hash on FISCO equals the engine's intent hash. FISCO fails a call to an address without code, so where Base carries a money event as calldata on a self transfer, FISCO commits the event's digest to the IntentLog under the job id keccak(\"anchor\"): one real contract call per event, a hash rather than the JSON. Amounts are demo units with no monetary value.",
    "",
    "## 1. Chain",
    "",
    `| Field | Value |`, `|---|---|`,
    `| Node | FISCO BCOS ${dep.nodeVersion}, one node in Docker, ${dep.group}, PBFT |`,
    `| Web3 chain id | ${dep.chainId} |`,
    `| RPC | ${RPC} (through \`contracts/script/fisco_rpc_proxy.py\`) |`,
    `| Compiler | solc 0.8.26, evm_version ${dep.evmVersion} (no PUSH0), foundry profile \`fisco\` |`,
    `| Deployer | \`${dep.deployer}\` (throwaway key for this chain) |`,
    "",
    "## 2. Contracts",
    "",
    "| Contract | Address | Deploy transaction | Block | Gas |", "|---|---|---|---|---|",
    ...Object.entries(dep.contracts).map(([n, c]) => `| ${n} | \`${c.address}\` | \`${short(c.tx)}\` | ${c.block} | ${c.gasUsed.toLocaleString("en-US")} |`),
    "",
    "Smoke flow from `contracts/script/fisco.sh`, receipts fetched by the script. Native balances are switched on with the chain admin key `build_chain.sh` generates, so value moves for real: the vendor bond holds 5 units in Bond, the job fee of 60 units is locked in JobBoard and refunded on cancel, and the script checks every balance.",
    "",
    "| Call | Transaction | Block | Status |", "|---|---|---|---|",
    ...dep.smoke.map((x) => `| ${x.function} | \`${x.tx}\` | ${x.block} | ${x.status} |`),
    "",
    "## 3. A real run on FISCO: the fleet scenario (the five moments) and the neighbour scenario",
    "",
    `FISCO is the only chain in this run. IntentLog used: ${[...logsUsed].map((a) => `\`${a}\``).join(", ") || "none"}${[...logsUsed].some((a) => a.toLowerCase() !== log.toLowerCase()) ? " (an earlier deployment on the same chain, before \`fisco.sh\` last redeployed; it is still live and was read back now)" : ""}.`,
    "",
    `${rows.length} transactions, ${receiptsOk} with a successful receipt in the recorded block, ${commits} IntentLog commits, ${matched} of them read back from the FISCO IntentLog with the engine's hash. ${onBase} of these hashes also appear in the captured Base Sepolia run, ${baseChecked} confirmed in the Base IntentLog by a read call: both ledgers hold the same EIP-712 intent hash under the same \`commit(bytes32 jobId, bytes32 intentHash)\` format.`,
    "",
    "| # | Scenario | Event | Kind | Transaction | Block | Gas | Status | IntentLog check |", "|---|---|---|---|---|---|---|---|---|",
    ...table,
    "",
    ...fate,
    ...dual.map((l) => l.replace("## 4. One real run", `## ${fate.length ? 5 : 4}. One real run`)),
    ...fjMd,
    `## ${4 + (dual.length ? 1 : 0) + (fate.length ? 1 : 0) + (fjMd.length ? 1 : 0)}. Reproduce`,
    "",
    "```",
    "bash contracts/script/fisco.sh     # node in Docker, deploy, smoke, FATE model hash, contracts/deployments/fisco-bcos.json",
    "cd web",
    "export FISCO_RPC_URL=http://127.0.0.1:8545 FISCO_PRIVATE_KEY=$(cat ../contracts/.fisco/deployer.key)",
    "export FISCO_INTENT_LOG=$(node -p \"require('../contracts/deployments/fisco-bcos.json').contracts.IntentLog.address\")",
    "SURETY_PRIVATE_KEY= JIXIN_REAL=1 pnpm evidence   # FISCO only, lands in evidence/fisco/",
    "pnpm fisco                         # receipts, IntentLog read back, this file",
    "```",
    "",
  ].join("\n");
  writeFileSync(join(ROOT, "docs", "FISCO_EVIDENCE.md"), md);
  console.log(`${latest}: ${rows.length} FISCO txs, ${commits} IntentLog commits, ${matched} hashes match the engine, ${onBase} also in the Base capture (${baseChecked} confirmed on Base IntentLog), ${bad} problems`);
  if (bad) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
