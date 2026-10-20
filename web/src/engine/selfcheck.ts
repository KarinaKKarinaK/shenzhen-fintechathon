// Runnable check: every attack must be blocked, every real scenario message must pass the gate,
// a normal instalment must be allowed, every slash rule must have a contract case, the removed
// rules must have none, and the model layer must have no reach into keys or chain.
import fs from "node:fs";
import path from "node:path";
import { runAll, runBenign, ATTACKS, scriptedGate } from "./attacks";
import { POST as buttonPOST } from "../app/api/button/route";
import { ADDR as KEY_ADDR, KEY_MODE, buildKeys, deriveDemoKey, publicKeyInfo, type KeyedActor } from "./keys";
import { execFileSync } from "node:child_process";
import { privateKeyToAccount } from "viem/accounts";
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
import { FLEET_PRIOR, newState, rateFor, score as creditScore, update as creditUpdate } from "./credit/score";
import { FATE_MODEL, federatedPd, federatedPrior, parseModel, DEMO_PILOT_PROFILE } from "./credit/federated";
import { createHash } from "node:crypto";
import { plan } from "./planner";
import { fiscoConfig, makeChain, RealChain } from "./chain";
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
  // The FATE federated prior: the TS scorer reproduces FATE's own predictions on held out rows,
  // the model hash matches its canonical JSON, and no model means the flat prior as before.
  if (!FATE_MODEL) { console.error("fate-model.json missing or malformed"); process.exit(1); }
  const fm = FATE_MODEL;
  const fateDiff = Math.max(...fm.checks.map((c) => Math.abs(federatedPd(c.features, fm) - c.fate_pd)));
  if (!(FATE_MODEL.checks.length >= 5 && fateDiff <= 1e-6)) { console.error("TS scorer does not reproduce FATE predictions within 1e-6", fateDiff); process.exit(1); }
  const canon = (v: unknown): string => Array.isArray(v) ? `[${v.map(canon).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}` : JSON.stringify(v);
  const { sha256: fateSha, sha256_of: _of, ...fateBody } = FATE_MODEL as unknown as Record<string, unknown>;
  void _of;
  if (createHash("sha256").update(canon(fateBody)).digest("hex") !== fateSha) { console.error("fate-model.json sha256 does not match its canonical JSON"); process.exit(1); }
  const flat = federatedPrior(DEMO_PILOT_PROFILE, parseModel(null)), fed = federatedPrior(DEMO_PILOT_PROFILE);
  if (flat.source !== "flat" || flat.prior !== FLEET_PRIOR || fed.source !== "fate" || fed.pd === null) { console.error("federated prior fallback wrong", { flat, fed }); process.exit(1); }
  console.log(`fate prior: TS scorer matches FATE ${FATE_MODEL.fate_version} on ${FATE_MODEL.checks.length} held out rows (max diff ${fateDiff.toExponential(1)}), model ${fateSha.slice(0, 12)}..., demo pilot pd ${fed.pd}, start rate ${rateFor(creditScore(newState(fed.prior)), DEFAULT_POLICY.rateBand).rateBps} bps vs flat ${rateFor(creditScore(newState()), DEFAULT_POLICY.rateBand).rateBps} bps`);
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
  // Fail safe sensors: a log without battery or altitude, or with a degraded reading, is held
  // with a reason naming the channel, never scored on a value predicted from the track.
  const okLog = plausible("job-201", 13601, 2267, 3, 60, 33.5, 0.26);
  if (!okLog.ok) { console.error("complete honest log flagged", okLog); process.exit(1); }
  for (const [label, b, a, want] of [["no battery", undefined, 0.26, "battery channel missing"], ["no altitude", 33.5, undefined, "altitude channel missing"], ["battery NaN", NaN, 0.26, "battery channel degraded"], ["battery 140", 140, 0.26, "battery channel degraded"], ["altitude negative", 33.5, -1, "altitude channel degraded"]] as const) {
    const t = plausible("job-201", 13601, 2267, 3, 60, b, a);
    if (t.ok || !t.reasons.some((r) => r.startsWith(want))) { console.error(`sensor fault not held: ${label}`, t); process.exit(1); }
  }
  console.log("oracle: missing or degraded battery and altitude channels hold the log with a reason");
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

  // The operator button signs as the operator, so it must refuse without the demo token.
  const savedToken = process.env.DEMO_TOKEN;
  const press = (h: Record<string, string> = {}) => buttonPOST(new Request("http://x/api/button", { method: "POST", headers: { "Content-Type": "application/json", ...h }, body: JSON.stringify({ what: "set_cap", amount: 10000, scenario: "attack" }) }));
  delete process.env.DEMO_TOKEN;
  const noEnv = await press({ "x-zishi-demo": "anything" });
  process.env.DEMO_TOKEN = "selfcheck-token";
  const noHeader = await press();
  const wrong = await press({ "x-zishi-demo": "wrong" });
  const right = await press({ "x-zishi-demo": "selfcheck-token" });
  if (savedToken === undefined) delete process.env.DEMO_TOKEN; else process.env.DEMO_TOKEN = savedToken;
  if (noEnv.status !== 401 || noHeader.status !== 401 || wrong.status !== 401 || right.status === 401) { console.error("button route auth unexpected", noEnv.status, noHeader.status, wrong.status, right.status); process.exit(1); }
  console.log(`button: 401 with no DEMO_TOKEN set, no header, wrong token; with the token it passes auth (status ${right.status})`);
  // Actor keys: random per process by default, the public label derivation only behind the flag.
  {
    const actors = Object.keys(KEY_ADDR) as KeyedActor[];
    const derived = Object.fromEntries(actors.map((a) => [a, privateKeyToAccount(deriveDemoKey(a)).address]));
    const r1 = buildKeys("random-per-process"), r2 = buildKeys("random-per-process");
    const det = buildKeys("deterministic-demo");
    const randomOk = actors.every((a) => r1[a].address !== r2[a].address && r1[a].address !== derived[a] && r2[a].address !== derived[a]);
    const detOk = actors.every((a) => det[a].address === derived[a]);
    // Two fresh module instances in separate processes, without the flag: random mode, different addresses.
    const tsx = path.join(process.cwd(), "node_modules", ".bin", "tsx");
    const probe = () => {
      const env = { ...process.env }; delete env.ZISHI_DETERMINISTIC_KEYS;
      return JSON.parse(execFileSync(tsx, ["-e", 'import { publicKeyInfo } from "./src/engine/keys"; console.log(JSON.stringify(publicKeyInfo()))'], { env, encoding: "utf8" }).trim().split("\n").pop()!) as ReturnType<typeof publicKeyInfo>;
    };
    const p1 = probe(), p2 = probe();
    const procOk = p1.mode === "random-per-process" && p2.mode === "random-per-process" && actors.every((a) => p1.addresses[a] !== p2.addresses[a] && p1.addresses[a] !== derived[a]);
    const info = publicKeyInfo();
    const noSecret = !JSON.stringify(info).match(/0x[0-9a-fA-F]{64}/);
    if (!randomOk || !detOk || !procOk || !noSecret || KEY_MODE !== "deterministic-demo") { console.error("actor key modes unexpected", { randomOk, detOk, procOk, noSecret, KEY_MODE }); process.exit(1); }
    console.log(`keys: default is random per process (two processes, ${actors.length} actors, all addresses differ and none equal the public label keys); ZISHI_DETERMINISTIC_KEYS=1 reproduces the label keys; public info has no private key`);
  }

  // FISCO BCOS target: off unless its RPC, key and IntentLog address are all set.
  const fiscoVars = { FISCO_RPC_URL: "http://127.0.0.1:8545", FISCO_PRIVATE_KEY: "0x" + "11".repeat(32), FISCO_INTENT_LOG: "0x" + "22".repeat(20) };
  const saved = { ...process.env };
  for (const k of ["FISCO_RPC_URL", "FISCO_PRIVATE_KEY", "FISCO_INTENT_LOG", "SURETY_PRIVATE_KEY"]) delete process.env[k];
  const unset = makeChain({ real: true });
  process.env = saved;
  if (fiscoConfig({}) !== null || fiscoConfig({ ...fiscoVars, FISCO_INTENT_LOG: undefined }) !== null || unset instanceof RealChain || !unset.simulated) { console.error("FISCO target is on without its env"); process.exit(1); }
  if (fiscoConfig(fiscoVars)?.chainId !== 20200) { console.error("FISCO target off with its env set"); process.exit(1); }
  console.log("fisco: target off when FISCO_RPC_URL, FISCO_PRIVATE_KEY or FISCO_INTENT_LOG is unset, on with all three");

  console.log(`ok: ${results.length - failed.length} of ${ATTACKS.length} attacks blocked, gated wallet error rate ${(failed.length / ATTACKS.length * 100).toFixed(0)} percent`);
  console.log(`naive wallet fell to ${naiveFell} of ${ATTACKS.length}, error rate ${(naiveFell / ATTACKS.length * 100).toFixed(0)} percent`);
  const sg = scriptedGate();
  console.log(`message gate alone (rules plus classifier) on the ${sg.n} scripted attack texts, none trained on: ${sg.stopped} stopped; classifier alone labels ${GATE.scripted.labelled.k} and holds ${GATE.scripted.held.k} at ${GATE.threshold}; the full pipeline blocks ${results.length - failed.length} of ${ATTACKS.length}`);
  console.log(`benign: ${benign.passed} of ${benign.total} real messages pass the gate, normal instalment allowed`);
}

main().catch((e) => { console.error(e); process.exit(1); });

// Ask the agent: the explanation of the declined fleet job (job-202, 20 mu at 3 yuan) uses the
// engine's own numbers, a clarifying question is asked, a correction recomputes through
// economics() and the planner, and lowering the reserve is refused. No model key needed.
async function askCheck() {
  const { answer, breakEven, ecoFor } = await import("./ask");
  const fail = (msg: string, v?: unknown) => { console.error(`ask: ${msg}`, v ?? ""); process.exit(1); };
  const job = { id: "job-202", title: "maize", mu: 20, fee: 60, distanceM: 250 };
  const eco = economics(60, DEMO.leaseRate, 20 * DEMO.energyPerMu, DEMO.reserveRule);
  const why = answer({ lang: "en", job, action: "why" });
  if (why.kind !== "explain" || eco.clears) fail("job-202 should be a decline explanation", why);
  for (const n of [eco.fee, eco.instalment, eco.energy, eco.rail, eco.margin, eco.reserveRule]) if (!why.text.includes(String(n))) fail(`explanation misses ${n}`, why.text);
  if (why.facts.margin !== eco.margin || why.facts.inst !== eco.instalment) fail("facts differ from economics()", why.facts);
  const be = breakEven(20);
  if (!why.question || !why.question.includes(String(be)) || !why.choices.some((c) => c.action === "accept_counter" && c.rate === be)) fail("no clarifying question with the break even", why);
  if (!ecoFor(20 * be, 20).clears || ecoFor(20 * (be - 0.1), 20).clears) fail(`break even ${be} is not the lowest clearing rate`);
  const yes = answer({ lang: "en", job, action: "accept_counter" });
  const beEco = ecoFor(Math.round(20 * be * 100) / 100, 20);
  if (yes.decision !== "accept" || yes.facts.margin !== beEco.margin) fail("accepting the break even did not recompute to accept", yes);
  const low = answer({ lang: "zh", job, action: "text", text: "每亩3.5元可以吗" });
  if (low.action !== "propose" || low.decision !== "decline" || low.facts.margin !== ecoFor(70, 20).margin) fail("a rate below break even was not recomputed and declined", low);
  const res = answer({ lang: "en", job, action: "text", text: "Can you lower the reserve for this job?" });
  if (res.decision !== "refused" || !/reserve rule/.test(res.text) || !res.text.includes("L3")) fail("lowering the reserve was not refused with its rule", res);
  const off = answer({ lang: "en", job, action: "text", text: "What is the weather tomorrow?" });
  if (off.kind !== "out_of_scope" || !off.choices.length) fail("out of scope question not handled", off);
  console.log(`ask: job-202 margin ${eco.margin} below ${eco.reserveRule}, break even ${be} yuan per mu accepted at margin ${beEco.margin}, 3.5 declined, lowering the reserve refused, off topic redirected`);
}
askCheck().catch((e) => { console.error(e); process.exit(1); });

// Recovery state machine of settle.ts with a mocked sender, no network: a network error retries and
// recovers, a revert goes straight to compensation, and retries that run out end in gave_up.
async function recoveryCheck() {
  const { withRecovery, classify } = await import("./settle");
  const fail = (msg: string, v?: unknown) => { console.error(`recovery: ${msg}`, v ?? ""); process.exit(1); };
  const sleep = async () => {};
  const run = async (attempt: (n: number) => Promise<{ hash: string; ok: boolean; block: number }>, compensate = false) => {
    const states: string[] = [];
    const r = await withRecovery("JobBoard.confirm", attempt, (s) => { states.push(s); }, { sleep });
    if (compensate && (r.outcome === "reverted" || r.outcome === "gave_up")) states.push("compensated");
    return { r, seq: states.join(">") };
  };
  const a = await run(async (n) => { if (n === 0) throw new Error("fetch failed: network error"); return { hash: "0xabc", ok: true, block: 1 }; });
  if (a.r.outcome !== "recovered" || a.seq !== "sent>failed>retry>sent>recovered") fail("retry then success", a);
  const b = await run(async () => ({ hash: "0xdef", ok: false, block: 2 }), true);
  if (b.r.outcome !== "reverted" || b.r.attempts !== 1 || b.seq !== "sent>failed>compensated") fail("revert then compensation", b);
  const b2 = await run(async () => { throw new Error("execution reverted: not locked"); }, true);
  if (b2.r.outcome !== "reverted" || b2.seq !== "sent>failed>compensated") fail("thrown revert must not retry", b2);
  const c = await run(async () => { throw new Error("request timed out"); });
  if (c.r.outcome !== "gave_up" || c.r.attempts !== 3 || c.seq !== "sent>failed>retry>sent>failed>retry>sent>failed>gave_up") fail("retries exhausted", c);
  if (classify(new Error("nonce too low")) !== "retry" || classify(new Error("execution reverted")) !== "revert") fail("classify");
  console.log(`recovery: retry then success (${a.seq}), revert then compensation (${b.seq}), retries exhausted (${c.seq})`);
}
recoveryCheck().catch((e) => { console.error(e); process.exit(1); });
