// One fleet run on the real FISCO BCOS chain with contract settlement (src/engine/settle.ts): the
// engine's money moments are calls to the deployed Bond, JobBoard, Lease and IntentLog with real
// native value. Fetches every receipt back and checks balances, then writes
// evidence/fisco/settled-run-<stamp>.json.
// Run: pnpm settle   (FISCO node at FISCO_RPC_URL, default http://127.0.0.1:8545; deployer key from
// contracts/.fisco/deployer.key unless FISCO_PRIVATE_KEY is set; the key is never printed)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const dep = JSON.parse(readFileSync(join(ROOT, "contracts", "deployments", "fisco-bcos.json"), "utf8")) as { contracts: Record<string, { address: string }> };
process.env.FISCO_RPC_URL ||= "http://127.0.0.1:8545";
process.env.FISCO_PRIVATE_KEY ||= readFileSync(join(ROOT, "contracts", ".fisco", "deployer.key"), "utf8").trim();
process.env.FISCO_INTENT_LOG ||= dep.contracts.IntentLog.address;
process.env.FISCO_BOND ||= dep.contracts.Bond.address;
process.env.FISCO_LEASE ||= dep.contracts.Lease.address;
process.env.FISCO_JOB_BOARD ||= dep.contracts.JobBoard.address;

async function main() {
  const { fleet, RUNS } = await import("../src/engine/scenarios");
  const model = await import("../src/engine/model");
  console.log(model.hasKey() ? `model on: ${model.FREE_OBJECT_MODELS.length} object and ${model.FREE_TEXT_MODELS.length} text free models` : "model off: no OpenRouter key, rules reader and templates only");
  const t0 = Date.now();
  const feed: string[] = [];
  const stream: unknown[] = []; // the model's part of the run: readings, checks, explanations, policy verdicts
  let contractEvents = 0, anchors = 0;
  for await (const e of fleet({ fast: true, fiscoOnly: true })) {
    if (e.t === "chain" && e.tx.status !== "finalised") {
      if (e.tx.label.startsWith("Contract:")) { if (e.tx.status === "confirmed") contractEvents += 1; }
      else if (e.tx.status === "pending") anchors += 1;
    }
    if (e.t === "narration" && /FISCO|Contract call|Recovery|Fault/.test(e.text)) feed.push(e.text);
    if (e.t === "understood" || e.t === "plan" || e.t === "policy" || e.t === "economics" || e.t === "narration" || (e.t === "agent.message" && !e.untrusted) || (e.t === "agent.message" && e.from === "requester")) stream.push(e);
  }
  const st = RUNS.get("fleet")?.settle;
  if (!st) { console.error("settlement was off: is the FISCO node up and the chain FISCO?"); process.exit(1); }

  // Holds release after 86.4 s on FISCO (HOLD_SECONDS in milliseconds): wait, then the agent calls releaseHold.
  if (process.env.SETTLE_WAIT_HOLDS !== "0") {
    console.log("waiting about 90 s for the FISCO hold window...");
    await new Promise((r) => setTimeout(r, 90_000));
    await st.releaseHolds();
    for (const e of st.drain()) if (e.t === "narration") feed.push(e.text);
  }

  // Every receipt fetched back from the node.
  const rows = [];
  for (const r of st.rows) {
    if (!r.tx.startsWith("0x")) { rows.push({ ...r, receipt: "none" }); continue; }
    const rc = await st.pub.getTransactionReceipt({ hash: r.tx as `0x${string}` });
    const tx = await st.pub.getTransaction({ hash: r.tx as `0x${string}` });
    rows.push({ ...r, block: Number(rc.blockNumber), status: rc.status === "success" ? "success" : "failed", valueOnChainWei: tx.value.toString(), to: tx.to });
  }

  const GAS_MONEY = BigInt(1_000_000_000);
  const lenderBal = await st.balance(st.addr("lender"));
  const lenderReceived = lenderBal - GAS_MONEY;
  const vbPosted = BigInt(rows.find((r) => r.call.startsWith("Bond.postVendorBond"))?.valueWei ?? "0");
  const vbNow = await st.vendorBond();
  const lease = await st.leaseState();
  const finalPay = BigInt(rows.find((r) => r.call.startsWith("Lease.pay"))?.valueWei ?? "0");
  const confirms = rows.filter((r) => r.call.startsWith("JobBoard.confirm") && r.status === "success").length;
  const checks = [
    { check: "lender received from the run (wei)", value: lenderReceived.toString(), detail: `instalments through Lease.pay on ${confirms} confirms: ${(lenderReceived - finalPay).toString()}, final Lease.pay by the pilot: ${finalPay.toString()}`, ok: lenderReceived > finalPay },
    { check: "vendor bond decreased by the penalty (wei)", value: (vbPosted - vbNow).toString(), detail: `posted ${vbPosted}, now ${vbNow}`, ok: vbPosted - vbNow === BigInt(200) * BigInt(1e9) },
    { check: "lease balance at the end (wei)", value: lease?.balance.toString() ?? "none", ok: lease?.balance === BigInt(0) },
    { check: "title owner is the pilot", value: lease?.title ?? "none", detail: `pilot ${st.addr("pilot")}`, ok: !!lease && lease.title.toLowerCase() === st.addr("pilot").toLowerCase() },
    { check: "every contract call succeeded", value: `${rows.filter((r) => r.status === "success").length} of ${rows.length}`, ok: rows.every((r) => r.status === "success") },
  ];

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(process.cwd(), "evidence", "fisco"); mkdirSync(dir, { recursive: true });

  // ZISHI_FAULT set: the recovery run. States, receipts and the refund balance check go to recovery-<fault>-<stamp>.json.
  if (st.fault) {
    const states = st.recovery.filter((r) => !r.call.startsWith("fund"));
    const rchecks = st.fault === "confirm-once"
      ? [{ check: "confirm failed once, retried and recovered", value: states.filter((r) => r.call === "JobBoard.confirm").map((r) => r.state).join(" > "), ok: st.recovery.some((r) => r.call === "JobBoard.confirm" && r.state === "retry") && st.recovery.some((r) => r.call === "JobBoard.confirm" && r.state === "recovered") }]
      : [{ check: "start reverted on chain", value: states.filter((r) => r.call === "JobBoard.start").map((r) => r.state).join(" > "), ok: st.recovery.some((r) => r.call === "JobBoard.start" && r.state === "failed" && !!r.tx) },
         { check: "farmer got the fee back through JobBoard.cancel (wei)", value: st.refunds.map((r) => `${r.jobId}: ${r.refunded} of ${r.fee}`).join(", ") || "none", ok: st.refunds.length > 0 && st.refunds.every((r) => r.ok) }];
    const rout = join(dir, `recovery-${st.fault}-${stamp}.json`);
    writeFileSync(rout, JSON.stringify({
      network: "FISCO BCOS (local)", ranAt: new Date().toISOString(), fault: st.fault, script: `ZISHI_FAULT=${st.fault} pnpm settle`,
      contracts: st.c, farmer: st.addr("farmer"), unit: "1 yuan = 1e9 wei",
      recovery: states, refunds: st.refunds, pendingProofs: st.pendingProofs, checks: rchecks,
      rows: rows.filter((r) => r.status !== "success" || /JobBoard\.(start|confirm|cancel)/.test(r.call)),
      narrations: feed.filter((n) => /Recovery|Fault/.test(n)),
    }, null, 2) + "\n");
    console.log(`wrote ${rout}`);
    console.table(states.map((r) => ({ moment: r.moment, call: r.call, state: r.state, tx: r.tx?.slice(0, 12) ?? "", detail: r.detail.slice(0, 90) })));
    console.table(rchecks);
    process.exit(rchecks.every((c) => c.ok) ? 0 : 1);
  }
  const out = join(dir, `settled-run-${stamp}.json`);
  writeFileSync(out, JSON.stringify({
    network: "FISCO BCOS (local)", ranAt: new Date().toISOString(), seconds: Math.round((Date.now() - t0) / 1000),
    script: "pnpm settle (web/scripts/settle-run.ts), one fleet run through the engine loop",
    contracts: st.c, roles: Object.fromEntries((["vendor", "agent", "lender", "farmer", "verifier", "pilot"] as const).map((r) => [r, st.addr(r)])),
    unit: "1 yuan = 1e9 wei", contractEventsInFeed: contractEvents, anchorsInFeed: anchors,
    rows, checks, narrations: feed,
    note: "Each row is a real FISCO transaction sent by the engine's Session during the fleet run, receipt fetched back. Money moments (vendor bond, job post, confirm with the fee split, rogue intent proof, final lease payment) are contract calls; intents are still committed to the IntentLog and the charging payment is still an anchor. Fund rows are plain transfers from the deployer to the fresh role keys.",
  }, null, 2) + "\n");
  console.log(`wrote ${out}`);

  // The event stream and a short summary, next to the receipts.
  type U = { t: "understood"; jobId: string; source: string; accepted?: boolean; used?: string; mismatch?: string[]; fields: { fee: number }; mu?: number };
  const und = new Map<string, U>();
  for (const e of stream as U[]) if (e.t === "understood") und.set(e.jobId, e);
  const offers = [...und.values()];
  const msgs = (stream as { t: string; untrusted?: boolean; source?: string; grounded?: boolean }[]).filter((e) => e.t === "agent.message" && !e.untrusted && e.source);
  const evOut = out.replace(/\.json$/, "-events.json");
  writeFileSync(evOut, JSON.stringify({ ranAt: new Date().toISOString(), receipts: out.split("/").pop(), events: stream, modelTranscript: model.transcript }, null, 2) + "\n");
  const summary = {
    ranAt: new Date().toISOString(), receipts: out.split("/").pop(), events: evOut.split("/").pop(),
    modelKey: model.hasKey(), freeModels: model.FREE_MODELS,
    offers: offers.length,
    offersReadByModel: offers.filter((o) => o.source === "model").length,
    readingsAcceptedByCode: offers.filter((o) => o.accepted).length,
    modelReadingsAcceptedByCode: offers.filter((o) => o.source === "model" && o.accepted).length,
    perOffer: offers.map((o) => ({ jobId: o.jobId, source: o.source, accepted: o.accepted, used: o.used, fee: o.fields.fee, mu: o.mu, mismatch: o.mismatch })),
    explanations: msgs.length,
    explanationsFromModel: msgs.filter((m) => m.source === "model").length,
    modelCallsRecorded: model.transcript.length,
    modelRepliesRejectedAsUngrounded: model.transcript.filter((x) => !x.grounded).length,
    contractCalls: rows.map((r) => ({ moment: r.moment, call: r.call, tx: r.tx, status: r.status })),
    contractCallsSucceeded: `${rows.filter((r) => r.status === "success").length} of ${rows.length}`,
    checksPassed: checks.every((c) => c.ok),
  };
  const sumOut = out.replace(/\.json$/, "-summary.json");
  writeFileSync(sumOut, JSON.stringify(summary, null, 2) + "\n");
  console.log(`wrote ${evOut}\nwrote ${sumOut}`);
  console.log(JSON.stringify({ ...summary, contractCalls: undefined, perOffer: undefined }, null, 2));
  console.table(rows.map((r) => ({ moment: r.moment, call: r.call.slice(0, 70), valueWei: r.valueWei, tx: r.tx.slice(0, 12), block: r.block, status: r.status })));
  console.table(checks.map((c) => ({ check: c.check, value: c.value, ok: c.ok })));
  for (const n of feed) console.log("narration:", n);
  console.log(`feed: ${contractEvents} contract events, ${anchors} anchors/commits`);
  process.exit(checks.every((c) => c.ok) ? 0 : 1);
}
main().catch((e) => { console.error(String((e as Error).message ?? e).split("\n")[0]); process.exit(1); });
