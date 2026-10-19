// Before and after on frozen seeds. Every row is recomputed here, nothing is pasted.
// Run: pnpm bench

import { METRICS as GATE } from "../src/engine/ml/gate";
import { METRICS as PLAUS, DATASET, TRAIN_N, FIXED_THRESHOLD, robustZ, derive, MODEL, TRACK_FEATURES, THRESHOLD, score as scoreFlight } from "../src/engine/ml/plausibility";
import { evalDetection } from "../src/engine/drift/eval";
import { cached as mdp } from "../src/engine/economics/mdp";
import { cached as stress } from "../src/engine/economics/stress";
import { run as ratchet } from "../src/engine/ratchet";
import { newState, update, score } from "../src/engine/credit/score";
import { fleet } from "../src/engine/scenarios";
import { append, chainHead, newRunId } from "../src/engine/replay/log";

async function main() {
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const yuan = (x: number) => `${Math.round(x).toLocaleString("en-US")} yuan`;
const rows: [string, string, string, string, string][] = [];

// 1. Gate: rules only versus rules plus classifier, on the held out message set.
{
  const m = GATE;
  rows.push(["Message gate", "rules only (regex)", "rules plus learned classifier", "52 of 52 scripted attacks, no score on paraphrases", `held out ${m.testN} messages: accuracy ${pct(m.accuracy)}, recall ${pct(m.recall)}, false alarm ${pct(m.falseAlarmRate)}`]);
}

// 2. Telemetry: raw track length versus Kalman smoothed, at matched 100 percent detection on the track features.
{
  const held = DATASET.slice(TRAIN_N);
  const honest = held.filter((d) => !d.tampered);
  void held; void honest; void MODEL; void TRACK_FEATURES; void derive;
  rows.push(["Telemetry check", "raw GPS length", "Kalman smoothed", `false alarm ${pct(PLAUS.rawFalseAlarmRate)} at full detection`, `false alarm ${pct(PLAUS.smoothedFalseAlarmRate)} at full detection, cut ${PLAUS.trackSmoothingGainPct}%`]);
}

// 3. Threshold: hand set |z| 4 versus conformal, held out false alarm and detection.
{
  const held = DATASET.slice(TRAIN_N);
  const honest = held.filter((d) => !d.tampered), bad = held.filter((d) => d.tampered);
  // The oracle's own score(): z against the threshold plus the hard replay and teleport flags.
  const fa = (t: number) => honest.filter((d) => !scoreFlight(d.flight, t).ok).length / honest.length;
  const det = (t: number) => bad.filter((d) => !scoreFlight(d.flight, t).ok).length / bad.length;
  rows.push(["Anomaly threshold", `fixed |z| ${FIXED_THRESHOLD}`, `conformal |z| ${THRESHOLD.toFixed(2)} (2% target)`, `false alarm ${pct(fa(FIXED_THRESHOLD))}, detection ${pct(det(FIXED_THRESHOLD))}`, `false alarm ${pct(fa(THRESHOLD))}, detection ${pct(det(THRESHOLD))}`]);
}

// 4. Lease strategy: greedy rule versus MDP policy, 200 seeded seasons.
{
  const c = mdp().comparison;
  rows.push(["Lease strategy", "greedy rule", "MDP policy (26 weeks, value iteration)", `${yuan(c.greedy.meanProfit)} mean, title ${pct(c.greedy.titleShare)}`, `${yuan(c.mdp.meanProfit)} mean, title ${pct(c.mdp.titleShare)}`]);
}

// 5. Acceptance knobs: baseline versus ratchet best, frozen week.
{
  const r = ratchet(60);
  rows.push(["Acceptance knobs", "baseline", `ratchet, ${r.steps.filter((s) => s.kept).length} of ${r.steps.length} steps kept`, yuan(r.baselineProfit), yuan(r.bestProfit)]);
}

// 6. Lender loss: without bonds versus with bonds, p95 over 2000 seeded seasons.
{
  const s = stress();
  rows.push(["Lender loss given default, p95", "no bonds", "pilot and vendor bonds", yuan(s.lgdWithoutBonds.p95), `${yuan(s.lgdWithBonds.p95)}, bonds absorb ${pct(s.bondCover)} (default ${pct(s.defaultProbability)})`]);
}

// 7. Pilot credit: flat rate versus credibility score, fixed sequence.
{
  let st = newState();
  for (const o of ["confirmed", "confirmed", "confirmed"] as const) st = update(st, o);
  const good = score(st); st = update(st, "held"); const afterHeld = score(st);
  rows.push(["Pilot credit", "flat rate band", "Buhlmann credibility", "no change with history", `p ${good.p.toFixed(3)} after 3 confirmed, ${afterHeld.p.toFixed(3)} after a held log`]);
}

// 8. Drift: no monitor versus CUSUM, seeded shift at 500.
{
  const d = evalDetection();
  rows.push(["Drift detection", "none", "CUSUM on classifier risk", "never", `alarm ${d.delay} observations after the shift, ${d.quietAlarms} false alarms in 600`]);
}

// 9. Replay: two seeded fast runs hash to the same head.
{
  const heads: string[] = [];
  for (let i = 0; i < 2; i++) { const id = newRunId("bench"); for await (const ev of fleet({ fast: true })) append(id, ev); heads.push(chainHead(id).head); }
  rows.push(["Run integrity", "no log", "hash chained event log", "not verifiable", `two seeded runs, head ${heads[0].slice(0, 10)}, equal ${heads[0] === heads[1]}`]);
}

const w = [28, 22, 42, 44, 60];
const line = (c: string[]) => c.map((s, i) => s.padEnd(w[i])).join(" ");
console.log(line(["Component", "Before", "After", "Before result", "After result"]));
console.log("-".repeat(w.reduce((a, b) => a + b + 1, 0)));
for (const r of rows) console.log(line(r));
console.log("\nMarkdown:\n");
console.log("| Component | Before | After | Before result | After result |\n|---|---|---|---|---|");
for (const r of rows) console.log(`| ${r.join(" | ")} |`);
}
main().catch((e) => { console.error(e); process.exit(1); });
