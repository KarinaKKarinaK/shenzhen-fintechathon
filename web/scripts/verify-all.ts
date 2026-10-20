// Re-checks every transaction hash the repo claims against its chain: deployments, full jobs,
// the captured real run and the latest evidence runs on Base Sepolia and FISCO BCOS.
// Per receipt: it exists, status is success, the block matches where the source records one,
// and for IntentLog.commit the calldata carries the recorded intent hash.
// Writes docs/results/receipts.json. Exit 1 on any failure.

import fs from "node:fs";
import path from "node:path";
import { decodeFunctionData, parseAbi, type Hex } from "viem";

const COMMIT_ABI = parseAbi(["function commit(bytes32 jobId, bytes32 intentHash)"]);
const WEB = process.cwd();
const ROOT = path.resolve(WEB, "..");
const DEP = path.join(ROOT, "contracts", "deployments");
const EVI = path.join(WEB, "evidence");

// Only the two RPC urls are read from .env.local, nothing else.
function envFile(key: string): string | undefined {
  const f = path.join(WEB, ".env.local");
  if (!fs.existsSync(f)) return undefined;
  const m = fs.readFileSync(f, "utf8").match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") || undefined : undefined;
}
const BASE_RPC = process.env.BASE_SEPOLIA_RPC || envFile("BASE_SEPOLIA_RPC") || "https://sepolia.base.org";
const FISCO_RPC = process.env.FISCO_RPC_URL || envFile("FISCO_RPC_URL") || "http://127.0.0.1:8545";

type Chain = "base" | "fisco";
type Item = { hash: string; block?: number; intentHash?: string; mustCommit?: boolean; label: string };
type Source = { name: string; chain: Chain; items: Item[] };
type Failure = { source: string; hash: string; label: string; reason: string };

const readJson = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
const isHash = (h: unknown): h is string => typeof h === "string" && /^0x[0-9a-fA-F]{64}$/.test(h);
const latest = (dir: string) => {
  if (!fs.existsSync(dir)) return undefined;
  const runs = fs.readdirSync(dir).filter((f) => /^run-.*\.json$/.test(f) && !f.endsWith(".state.json")).sort();
  return runs.length ? path.join(dir, runs[runs.length - 1]) : undefined;
};

// One item per hash; a later row with a block number wins over the pending row with block 0.
function dedupe(items: Item[]): Item[] {
  const m = new Map<string, Item>();
  for (const it of items) {
    const k = it.hash.toLowerCase();
    const prev = m.get(k);
    m.set(k, { ...prev, ...it, block: it.block || prev?.block || undefined, intentHash: it.intentHash ?? prev?.intentHash, mustCommit: it.mustCommit || prev?.mustCommit });
  }
  return [...m.values()];
}

function deploySource(file: string, name: string, chain: Chain): Source | undefined {
  if (!fs.existsSync(file)) return undefined;
  const d = readJson(file);
  const items: Item[] = [];
  for (const [c, v] of Object.entries<Record<string, unknown>>(d.contracts ?? {})) {
    if (isHash(v.tx)) items.push({ hash: v.tx, block: typeof v.block === "number" ? v.block : undefined, label: `deploy ${c}` });
    const p = v.previous as Record<string, unknown> | undefined;
    if (p && isHash(p.tx)) items.push({ hash: p.tx, label: `deploy ${c} (previous)` });
  }
  if (isHash(d.setBoardTx)) items.push({ hash: d.setBoardTx, label: "Bond.setBoard" });
  for (const s of d.smoke ?? []) if (isHash(s.tx)) items.push({ hash: s.tx, block: s.block, label: `smoke ${s.function}`, mustCommit: s.function === "IntentLog.commit" });
  const f = d.fateModel;
  if (f && isHash(f.tx)) items.push({ hash: f.tx, block: f.block, intentHash: f.sha256, mustCommit: true, label: "fate model hash commit" });
  return { name, chain, items: dedupe(items) };
}

function fulljobSource(file: string, name: string, chain: Chain): Source | undefined {
  if (!fs.existsSync(file)) return undefined;
  const items: Item[] = (readJson(file).steps ?? []).filter((s: { tx: unknown }) => isHash(s.tx))
    .map((s: { tx: string; block?: number; step: string; contract: string; function: string }) => ({ hash: s.tx, block: s.block, label: `step ${s.step} ${s.contract}.${s.function}`, mustCommit: s.contract === "IntentLog" && s.function === "commit" }));
  return { name, chain, items: dedupe(items) };
}

type Row = { hash: string; block?: number; claim?: string; simulated?: boolean; network?: string; intentHash?: string; fiscoHash?: string };
const rowItem = (r: Row): Item => ({ hash: r.hash, block: r.block, intentHash: r.intentHash, mustCommit: (r.claim ?? "").startsWith("IntentLog.commit"), label: r.claim ?? "" });

function collect(): Source[] {
  const out: (Source | undefined)[] = [];
  out.push(deploySource(path.join(DEP, "base-sepolia.json"), "Base Sepolia deployments", "base"));
  out.push(fulljobSource(path.join(DEP, "base-sepolia-fulljob.json"), "Base Sepolia full job", "base"));

  const sse = fs.existsSync(EVI) ? fs.readdirSync(EVI).filter((f) => /^real-run-.*\.sse$/.test(f)).sort() : [];
  for (const f of sse) {
    const items: Item[] = [];
    for (const line of fs.readFileSync(path.join(EVI, f), "utf8").split("\n")) {
      if (!line.startsWith("data:")) continue;
      try {
        const e = JSON.parse(line.slice(5));
        if (e.t === "chain" && e.tx && !e.tx.simulated && isHash(e.tx.hash)) items.push(rowItem({ ...e.tx, claim: e.tx.label }));
      } catch { /* not a JSON event */ }
    }
    out.push({ name: `Base Sepolia captured run ${f}`, chain: "base", items: dedupe(items) });
  }

  const baseRun = latest(EVI);
  if (baseRun) {
    const rows = (readJson(baseRun) as Row[]).filter((r) => r.simulated === false && r.network === "base-sepolia" && isHash(r.hash));
    out.push({ name: `Base Sepolia evidence ${path.basename(baseRun)}`, chain: "base", items: dedupe(rows.map(rowItem)) });
    const mirror = rows.filter((r) => isHash(r.fiscoHash)).map((r) => ({ hash: r.fiscoHash as string, intentHash: r.intentHash, label: `FISCO mirror of ${r.claim}` }));
    if (mirror.length) out.push({ name: `FISCO mirror in dual run ${path.basename(baseRun)}`, chain: "fisco", items: dedupe(mirror) });
  }

  out.push(deploySource(path.join(DEP, "fisco-bcos.json"), "FISCO BCOS deployments", "fisco"));
  out.push(fulljobSource(path.join(DEP, "fisco-fulljob.json"), "FISCO BCOS full job", "fisco"));
  // Engine runs that settled on the deployed contracts (web/evidence/fisco/settled-run-*.json, receipts only).
  const fdir = path.join(process.cwd(), "evidence", "fisco");
  for (const f of fs.existsSync(fdir) ? fs.readdirSync(fdir).filter((x) => /^(settled-run|recovery-[a-z-]+)-.*Z\.json$/.test(x)).sort() : []) {
    const rows = ((readJson(path.join(fdir, f)).rows ?? []) as { tx?: string; block?: number; call?: string; status?: string }[]).filter((r) => r.status !== "failed");
    out.push({ name: `FISCO BCOS engine settled run ${f}`, chain: "fisco", items: dedupe(rows.filter((r) => isHash(r.tx)).map((r) => ({ hash: r.tx as string, block: r.block, label: r.call ?? "" }))) });
  }
  out.push(deploySource(path.join(DEP, "fisco-v2.json"), "FISCO BCOS v2 deployments", "fisco"));
  const fiscoRun = latest(path.join(EVI, "fisco"));
  if (fiscoRun) {
    const rows = (readJson(fiscoRun) as Row[]).filter((r) => r.simulated === false && r.network === "fisco" && isHash(r.hash));
    out.push({ name: `FISCO BCOS evidence fisco/${path.basename(fiscoRun)}`, chain: "fisco", items: dedupe(rows.map(rowItem)) });
  }
  return out.filter((s): s is Source => !!s && s.items.length > 0);
}

let intentChecked = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function rpc(url: string, method: string, params: unknown[]): Promise<Record<string, string> | null> {
  let wait = 500;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(15000) });
      if (res.status === 429 || res.status >= 500) throw new Error(`http ${res.status}`);
      const j = await res.json();
      if (j.error) {
        if (j.error.code === 429 || /rate|limit/i.test(String(j.error.message))) throw new Error(`rpc ${j.error.message}`);
        throw Object.assign(new Error(`rpc error ${j.error.message}`), { final: true });
      }
      return j.result ?? null;
    } catch (e) {
      if ((e as { final?: boolean }).final || attempt >= 6) throw e;
      await sleep(wait + Math.random() * 250);
      wait *= 2;
    }
  }
}

async function check(url: string, it: Item): Promise<string | null> {
  const r = await rpc(url, "eth_getTransactionReceipt", [it.hash]);
  if (!r) return "no receipt";
  if (r.status !== "0x1") return `status ${r.status}`;
  const block = parseInt(r.blockNumber, 16);
  if (it.block && block !== it.block) return `block ${block}, source says ${it.block}`;
  if (it.intentHash || it.mustCommit) {
    const tx = await rpc(url, "eth_getTransactionByHash", [it.hash]);
    if (!tx) return "no transaction";
    let decoded: Hex | undefined;
    try {
      const d = decodeFunctionData({ abi: COMMIT_ABI, data: tx.input as Hex });
      decoded = d.args[1];
    } catch { /* not a commit call */ }
    if (!decoded) return it.mustCommit ? "calldata is not IntentLog.commit" : null; // anchored event, no commit to compare
    if (it.intentHash && decoded.toLowerCase() !== it.intentHash.toLowerCase()) return `intent hash ${decoded}, source says ${it.intentHash}`;
    if (it.intentHash) intentChecked++;
  }
  return null;
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function reachable(url: string) {
  try { return !!(await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }), signal: AbortSignal.timeout(4000) })).ok; } catch { return false; }
}

async function main() {
  const sources = collect();
  const fiscoUp = await reachable(FISCO_RPC);
  const failures: Failure[] = [];
  const report: { name: string; chain: Chain; claimed: number; verified: number; failed: number; skipped?: string }[] = [];
  let total = 0, ok = 0, skipped = 0;

  for (const s of sources) {
    if (s.chain === "fisco" && !fiscoUp) {
      report.push({ name: s.name, chain: s.chain, claimed: s.items.length, verified: 0, failed: 0, skipped: "node unreachable" });
      skipped += s.items.length;
      console.log(`${s.name}: ${s.items.length} skipped, node unreachable`);
      continue;
    }
    const url = s.chain === "base" ? BASE_RPC : FISCO_RPC;
    let good = 0;
    await pool(s.items, s.chain === "base" ? 3 : 8, async (it) => {
      let why: string | null;
      try { why = await check(url, it); } catch (e) { why = `fetch failed: ${(e as Error).message.split("\n")[0]}`; }
      if (why) failures.push({ source: s.name, hash: it.hash, label: it.label, reason: why });
      else good++;
    });
    total += s.items.length; ok += good;
    report.push({ name: s.name, chain: s.chain, claimed: s.items.length, verified: good, failed: s.items.length - good });
    console.log(`${s.name}: ${good} of ${s.items.length} verified`);
  }

  for (const f of failures) console.log(`  FAIL ${f.source} ${f.hash} (${f.label}): ${f.reason}`);
  console.log(`${ok} of ${total} receipts verified, ${intentChecked} intent hashes matched in calldata${skipped ? `, ${skipped} skipped (FISCO node unreachable)` : ""}`);

  const outDir = path.join(ROOT, "docs", "results");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "receipts.json"), JSON.stringify({
    ranAt: new Date().toISOString(),
    script: "web/scripts/verify-all.ts (pnpm verify:all)",
    checks: "receipt exists, status success, block matches the source where recorded, IntentLog.commit calldata carries the recorded intent hash",
    total, verified: ok, failed: total - ok, skipped, intentHashesMatched: intentChecked,
    sources: report, failures,
  }, null, 2) + "\n");
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
