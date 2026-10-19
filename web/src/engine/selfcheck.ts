// Runnable check: every attack must be blocked, every real scenario message must pass the gate,
// a normal instalment must be allowed, every slash rule must have a contract case, the removed
// rules must have none, and the model layer must have no reach into keys or chain.
import fs from "node:fs";
import path from "node:path";
import { runAll, runBenign, ATTACKS } from "./attacks";
import { PolicyEngine, DEFAULT_POLICY, DEMO } from "./policy";
import { SLASH_RULES } from "./contracts";
import { sign, economics } from "./agents";
import { frame, PREAMBLE } from "./framing";
import { METRICS as GATE } from "./ml/gate";
import { METRICS as PLAUS } from "./ml/plausibility";
import { run } from "./ratchet";
import { honestLog, plausible } from "./oracle";
import { fuse } from "./fusion/kalman";
import { syntheticTrack, rng } from "./ml/plausibility";
import { newState, rateFor, score as creditScore, update as creditUpdate } from "./credit/score";
import { plan } from "./planner";
import { custom } from "./scenarios";
import { InputError, parseRunInput } from "./schema";
import { SAMPLES } from "./samples";
import { ingest } from "../lib/ingest";
import { getEconomicsMetrics } from "./economics";
import { EVAL as DRIFT } from "./drift/monitor";
import { fleet } from "./scenarios";
import { append, chainHead, entries, verify, verifyEntries } from "./replay/log";

async function main() {
  const results = await runAll();
  const failed = results.filter((r) => !r.blocked);
  const benign = runBenign();
  const naiveFell = results.filter((r) => r.naive === "fell").length;
  const normal = await new PolicyEngine(DEFAULT_POLICY, "selfcheck").evaluate(await sign("machine", "pay_instalment", { jobId: "job-201", payee: DEFAULT_POLICY.allowlist.lender, amount: 96 }), { reference: 96, fee: 240 });

  console.table(results.map((r) => ({ id: r.id, layer: r.layer, standard: r.standard, blocked: r.blocked, naive: r.naive, detail: r.detail.slice(0, 50) })));
  if (failed.length) { console.error("attacks not blocked:", failed.map((f) => f.id)); process.exit(1); }
  if (benign.failed.length) { console.error("benign messages not passing:", benign.failed); process.exit(1); }
  if (normal.verdict !== "allow") { console.error("normal instalment was blocked", normal); process.exit(1); }
  if (!frame("x", "counterparty", "hi").startsWith(PREAMBLE)) { console.error("frame does not start with the preamble"); process.exit(1); }

  // Rule coverage: every slash rule has a contract case, the removed rules have none anywhere.
  const attacksSrc = fs.readFileSync(path.join(__dirname, "attacks.ts"), "utf8");
  const uncovered = SLASH_RULES.filter((r) => !attacksSrc.includes(`"${r}"`));
  if (uncovered.length) { console.error("slash rules without a case:", uncovered); process.exit(1); }
  const engineSrc = fs.readdirSync(__dirname).filter((f) => f.endsWith(".ts") && f !== "selfcheck.ts").map((f) => fs.readFileSync(path.join(__dirname, f), "utf8")).join("\n");
  const removed = ["NoCoverBound", "UnconfirmedClaim", "coverBound", "bindCover"].filter((r) => engineSrc.includes(r));
  if (removed.length) { console.error("removed rules still referenced:", removed); process.exit(1); }
  console.log(`rules: ${SLASH_RULES.join(", ")} each have a contract case; cover and unconfirmed-claim rules are gone`);

  // Learned components, each measured on a held out set picked by a fixed seed.
  console.log("message classifier (held out):", GATE);
  console.log("telemetry anomaly model (held out):", PLAUS);
  const ratchet = run(60);
  console.log(`strategy ratchet: baseline ${ratchet.baselineProfit}, best ${ratchet.bestProfit} after ${ratchet.steps.length} steps, ${ratchet.steps.filter((s) => s.kept).length} kept`);
  if (GATE.accuracy < 0.9) { console.error("classifier accuracy below 0.9", GATE); process.exit(1); }
  if (PLAUS.detectionRate < 0.9) { console.error("anomaly detection rate below 0.9", PLAUS); process.exit(1); }
  if (PLAUS.falseAlarmRate > 0.1) { console.error("anomaly false alarm rate above 0.1", PLAUS); process.exit(1); }
  // Conformal threshold: calibrated for a 2 percent false alarm rate on flights the fit never
  // saw; the held out rate must stay under 5 percent. The Kalman track filter must not raise
  // the false alarm rate against raw sample lengths at matched detection.
  console.log(`conformal: threshold |z| ${PLAUS.conformalThreshold} for a ${PLAUS.targetFalseAlarm * 100} percent target, held out false alarm ${(PLAUS.achievedFalseAlarm * 100).toFixed(1)} percent, coverage ${(PLAUS.coverage * 100).toFixed(1)} percent, ${PLAUS.calibrationN} calibration flights`);
  console.log(`track filter: raw lengths need |z| ${PLAUS.rawThreshold} to match ${(PLAUS.matchedDetection * 100).toFixed(0)} percent detection and then false alarm ${(PLAUS.rawFalseAlarmRate * 100).toFixed(1)} percent; filtered ${(PLAUS.smoothedFalseAlarmRate * 100).toFixed(1)} percent at |z| ${PLAUS.fixedThreshold}; gain ${PLAUS.trackSmoothingGainPct} percent`);
  console.log("caught by tamper class (held out):", PLAUS.byTamper);
  if (PLAUS.achievedFalseAlarm > 0.05) { console.error("conformal held out false alarm above 0.05", PLAUS); process.exit(1); }
  if (!(PLAUS.trackSmoothingGainPct >= 0)) { console.error("track filter raised the false alarm rate", PLAUS); process.exit(1); }
  // The replay detector: the same samples fused twice against one registry are flagged the
  // second time, a different flight is not.
  const registry = new Set<string>();
  const trackA = syntheticTrack(rng(1), 6000, 6, 3, 1.5, 150), trackB = syntheticTrack(rng(2), 6000, 6, 3, 1.5, 150);
  const first = fuse(trackA, { seen: registry }), again = fuse(trackA, { seen: registry }), other = fuse(trackB, { seen: registry });
  if (first.replayed || !again.replayed || other.replayed) { console.error("replay detector wrong", { first: first.replayed, again: again.replayed, other: other.replayed }); process.exit(1); }
  if (first.outliers.length !== 0 || Math.abs(first.smoothedTrackM - 6000) / 6000 > 0.05) { console.error("filter off on a clean track", first); process.exit(1); }
  console.log(`track filter: raw ${first.rawTrackM} m, smoothed ${first.smoothedTrackM} m for a 6000 m flight at 1.5 m noise, replay of the same log flagged, a different log not`);
  // The credit score on a fixed sequence: rises over three confirmed jobs, falls on a held log.
  let credit = newState();
  const ps: number[] = [creditScore(credit).p];
  for (const o of ["confirmed", "confirmed", "confirmed"] as const) { credit = creditUpdate(credit, o); ps.push(creditScore(credit).p); }
  credit = creditUpdate(credit, "held"); ps.push(creditScore(credit).p);
  const rose = ps[1] > ps[0] && ps[2] > ps[1] && ps[3] > ps[2], fell = ps[4] < ps[3];
  const cs = creditScore(credit);
  console.log(`credit score: ${ps.map((p) => p.toFixed(3)).join(" > ")} over prior, 3 confirmed, 1 held; now tier ${cs.tier}, credibility ${cs.credibility}, rate ${rateFor(cs, DEFAULT_POLICY.rateBand).rateBps} bps`);
  if (!rose || !fell) { console.error("credit score did not rise on confirmed jobs and fall on a held one", ps); process.exit(1); }
  if (!(ratchet.bestProfit >= ratchet.baselineProfit)) { console.error("ratchet went backwards", ratchet); process.exit(1); }
  // Economics: the lease MDP against the greedy rule on the same seeded seasons, the second
  // price auction on its fixed example, the bond stress test.
  const eco = getEconomicsMetrics();
  const cmp = eco.mdp.comparison;
  console.log(`lease MDP: ${eco.mdp.states} states over ${eco.mdp.horizon} weeks, expected profit ${eco.mdp.expectedProfit} yuan (value iteration)`);
  console.log(`lease MDP vs greedy on ${cmp.seasons} seeded seasons: mean ${cmp.mdp.meanProfit} vs ${cmp.greedy.meanProfit} yuan, sd ${cmp.mdp.sd} vs ${cmp.greedy.sd}, weeks to title ${cmp.mdp.weeksToTitle} vs ${cmp.greedy.weeksToTitle} (title reached in ${cmp.mdp.titleShare * 100} vs ${cmp.greedy.titleShare * 100} percent of seasons)`);
  console.log(`strategy ratchet over a season (MDP policy, ${ratchet.season.seasons} seeded seasons): baseline knobs ${ratchet.season.baselineProfit}, best knobs ${ratchet.season.bestProfit}, greedy rule with the best knobs ${ratchet.season.greedyMeanProfit} yuan`);
  if (!(cmp.mdp.meanProfit >= cmp.greedy.meanProfit)) { console.error("MDP policy below the greedy rule on the same seeds", cmp); process.exit(1); }
  const au = eco.auction;
  console.log(`second price auction: honest ${au.honest.winner} first at ${au.honest.price} per mu; maize inflates to 5 and wins at ${au.inflated.price}, utility ${au.inflatedUtility} (truthful: ${au.truthful})`);
  if (au.honest.winner !== "rice" || au.honest.price !== 3.5 || au.inflated.winner !== "maize" || au.inflated.price !== 4.2 || !(au.inflatedUtility < 0) || !au.truthful) { console.error("auction example unexpected", au); process.exit(1); }
  const st = eco.stress;
  console.log(`bond stress (${st.seasons} seeded seasons): default ${st.defaultProbability * 100} percent, pilot bond below minimum after reaching it ${st.pilotBondBelowMinAfterReaching * 100} percent, vendor bond drawdown ${st.expectedVendorDrawdown} yuan expected, lender loss given default p95 ${st.lgdWithoutBonds.p95} without bonds, ${st.lgdWithBonds.p95} with bonds`);
  if (!(st.lgdWithBonds.p95 <= st.lgdWithoutBonds.p95) || st.defaultProbability < 0 || st.defaultProbability > 1) { console.error("stress summary unexpected", st); process.exit(1); }
  const honest = honestLog("job-201", 60);
  if (!honest.ok) { console.error("honest flight log flagged", honest); process.exit(1); }
  const faked = plausible("job-204", 2400, 400, 2, 50);
  if (faked.ok) { console.error("faked flight log not flagged", faked); process.exit(1); }
  const day = plan({ jobs: [{ id: "a", title: "a", fee: 240, mu: 60, distanceM: 300, windowMin: 480 }, { id: "b", title: "b", fee: 60, mu: 20, distanceM: 300, windowMin: 480 }], budgetMu: 55, charges: 2, dayMinutes: 480, eco: (fee, mu) => economics(fee, DEMO.leaseRate, mu * DEMO.energyPerMu, DEMO.reserveRule), reason: (k) => k });
  if (day.method !== "knapsack" || day.usedMu !== 60 || day.items.find((i) => i.jobId === "b")?.why !== "below") { console.error("planner result unexpected", day); process.exit(1); }
  // Two accepted jobs that cannot both fit a 90 minute window: the auction orders them and
  // the winner's priority price is the runner up's margin per mu.
  const pair = plan({ jobs: [{ id: "a", title: "a", fee: 240, mu: 60, distanceM: 300, windowMin: 90 }, { id: "c", title: "c", fee: 300, mu: 40, distanceM: 300, windowMin: 90 }], budgetMu: 55, charges: 2, dayMinutes: 480, eco: (fee, mu) => economics(fee, DEMO.leaseRate, mu * DEMO.energyPerMu, DEMO.reserveRule), reason: (k) => k });
  const won = pair.auctions[0];
  if (pair.auctions.length !== 1 || won.winner !== "c" || won.runnerUp !== "a" || won.price !== 1.72 || pair.items[0].jobId !== "c") { console.error("planner auction unexpected", pair); process.exit(1); }
  console.log(`planner auction: ${won.winner} flies before ${won.runnerUp} at a priority price of ${won.price} per mu`);

  // Every sample in public/samples parses and runs through custom() to a done event. The
  // malformed one must fail with the paths a judge needs to fix it.
  const samplesDir = path.join(__dirname, "..", "..", "public", "samples");
  for (const s of SAMPLES) {
    const text = fs.readFileSync(path.join(samplesDir, s.file), "utf8");
    if (!s.runnable) continue;
    const flights = s.file === "jobs.csv" ? fs.readFileSync(path.join(samplesDir, "flights.csv"), "utf8") : undefined;
    const input = ingest({ text, flights });
    let done = false, events = 0;
    for await (const ev of custom(input, { fast: true })) { events += 1; if (ev.t === "done") done = true; }
    if (!done) { console.error(`sample ${s.file} did not reach done`); process.exit(1); }
    console.log(`sample ${s.file}: ${input.jobs.length} jobs, ${events} events, done`);
  }
  // Shape errors come first; the cross reference (a flight for a job that does not exist) is
  // reported once the shape is fixed.
  const malformed = JSON.parse(fs.readFileSync(path.join(samplesDir, "malformed.json"), "utf8")) as { jobs: Record<string, unknown>[] };
  const expectIssues = (input: unknown, want: string[]) => {
    try { parseRunInput(input); console.error("malformed sample was accepted"); process.exit(1); }
    catch (e) {
      const paths = e instanceof InputError ? e.issues.map((i) => i.path) : [];
      for (const w of want) if (!paths.includes(w)) { console.error(`malformed sample: expected an issue at ${w}, got`, paths); process.exit(1); }
      console.log(`malformed sample rejected at ${paths.join(", ")}`);
    }
  };
  expectIssues(malformed, ["jobs.1.mu", "jobs.1.requester"]);
  expectIssues({ ...malformed, jobs: [malformed.jobs[0], { ...malformed.jobs[1], mu: 20, requester: "Farmer Lin" }] }, ["flights.0.jobId"]);

  // Architecture check: the model layer cannot reach keys, chain, contracts, policy or signing.
  const src = fs.readFileSync(path.join(__dirname, "model.ts"), "utf8");
  const banned = ["viem", "./chain", "./contracts", "./policy", "SURETY_PRIVATE_KEY", "sign(", "tools:"];
  const hit = banned.filter((b) => src.includes(b));
  if (hit.length) { console.error("model.ts reaches into:", hit); process.exit(1); }
  console.log("model layer: no key, no chain, no tools, no signing");

  // drift and replay
  // CUSUM on seeded synthetic scores: 500 benign then 100 attack must alarm within 20 of the
  // shift, 600 benign must stay quiet. Then two fleet runs on the same settings in fast mode
  // must end on the same chain head, and a tampered copy must break at the tampered index.
  console.log("drift detector (synthetic, seeded):", DRIFT);
  if (DRIFT.delay === null || DRIFT.delay < 1 || DRIFT.delay > 20) { console.error("drift alarm not within 20 observations of the shift", DRIFT); process.exit(1); }
  if (DRIFT.quietAlarms !== 0) { console.error("drift alarmed on benign scores", DRIFT); process.exit(1); }
  console.log(`drift: detection delay ${DRIFT.delay} observations, ${DRIFT.quietAlarms} false alarms in 600 benign`);
  for (const id of ["selfcheck-a", "selfcheck-b"]) for await (const ev of fleet({ fast: true })) append(id, ev);
  const ha = chainHead("selfcheck-a"), hb = chainHead("selfcheck-b");
  if (ha.head !== hb.head || ha.length !== hb.length) { console.error("replay heads differ between two fleet runs", ha, hb); process.exit(1); }
  if (!verify("selfcheck-a").ok) { console.error("replay chain does not verify", verify("selfcheck-a")); process.exit(1); }
  const tampered = entries("selfcheck-a").map((e) => ({ ...e, ev: { ...e.ev } }));
  (tampered[7].ev as { text?: string }).text = "edited";
  const broken = verifyEntries(tampered);
  if (broken.ok || broken.brokenAt !== 7) { console.error("tampered replay not caught at index 7", broken); process.exit(1); }
  console.log(`replay: two fleet runs end on head ${ha.head.slice(0, 10)}... over ${ha.length} events, tamper caught at ${broken.brokenAt}`);

  console.log(`ok: ${results.length - failed.length} of ${ATTACKS.length} attacks blocked, gated wallet error rate ${(failed.length / ATTACKS.length * 100).toFixed(0)} percent`);
  console.log(`naive wallet fell to ${naiveFell} of ${ATTACKS.length}, error rate ${(naiveFell / ATTACKS.length * 100).toFixed(0)} percent`);
  console.log(`benign: ${benign.passed} of ${benign.total} real messages pass the gate, normal instalment allowed`);
}

main().catch((e) => { console.error(e); process.exit(1); });
