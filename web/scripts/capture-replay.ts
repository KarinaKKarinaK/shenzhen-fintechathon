// Records one public style fleet run on FISCO BCOS (fresh key, settlement on the deployed contracts)
// into src/engine/data/replay-fleet.json for /api/run?replay=1. Needs FISCO_RPC_URL, FISCO_PRIVATE_KEY,
// FISCO_INTENT_LOG; OPENROUTER_API_KEY optional. Run: npx tsx scripts/capture-replay.ts
import fs from "node:fs";
import path from "node:path";
import { fleet } from "../src/engine/scenarios";

(async () => {
  const events: unknown[] = [];
  for await (const ev of fleet({ fast: true, real: true, fiscoOnly: true, lang: "en" })) events.push(ev);
  const out = path.join(process.cwd(), "src", "engine", "data", "replay-fleet.json");
  fs.writeFileSync(out, JSON.stringify({ capturedAt: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC", events }));
  const chain = events.filter((e) => (e as { t: string }).t === "chain") as { tx: { label: string; hash: string } }[];
  console.log(`${events.length} events, ${new Set(chain.map((c) => c.tx.hash)).size} transactions, ${new Set(chain.filter((c) => c.tx.label.startsWith("Contract")).map((c) => c.tx.hash)).size} contract calls -> ${out}`);
})().catch((e) => { console.error(e); process.exit(1); });
