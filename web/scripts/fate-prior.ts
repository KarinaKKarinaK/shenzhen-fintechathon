// What the FATE prior changes for new pilots. Reads the held out pilots fate/experiment.py
// wrote (fate/out/test_pilots.json, with each pilot's true default probability from the
// generator) and compares the flat fleet prior against the federated prior on the engine's own
// score and rate band. The target is the rate the engine converges to for that pilot as jobs
// accrue: each Beta at the long run rate its outcomes imply. Each pilot flies n jobs, seeded: an
// instalment is missed with probability pd_true, a log is held with the fleet rate, otherwise
// the job is confirmed; both arms see the same outcomes. Writes prior_effect into
// fate/results.json. Run by fate/run.sh after the FATE run.
import fs from "node:fs";
import path from "node:path";
import { FLEET_PRIOR, newState, rateFor, score, update, type CreditOutcome, type CreditPrior } from "../src/engine/credit/score";
import { FATE_MODEL, federatedPrior, type PilotProfile } from "../src/engine/credit/federated";
import { DEFAULT_POLICY } from "../src/engine/policy";
import { rng } from "../src/engine/economics/rng";

const root = path.join(__dirname, "..", "..", "fate");
const test = JSON.parse(fs.readFileSync(path.join(root, "out", "test_pilots.json"), "utf8")) as { seed: number; rows: (PilotProfile & { pd_true: number })[] };
if (!FATE_MODEL) throw new Error("no valid FATE model in web/src/engine/credit/fate-model.json");
const band = DEFAULT_POLICY.rateBand;
const bps = (prior: CreditPrior, outs: CreditOutcome[]) => rateFor(score(outs.reduce(update, newState(prior))), band).rateBps;
const JOBS = [0, 5, 20];
const SIM_SEED = 7;

const rand = rng(SIM_SEED);
const err: Record<string, { flat: number[]; fate: number[] }> = Object.fromEntries(JOBS.map((n) => [n, { flat: [], fate: [] }]));
const risky = { flat: [] as number[], fate: [] as number[] }, safe = { flat: [] as number[], fate: [] as number[] };
for (const p of test.rows) {
  const q = Math.min(p.pd_true, 0.9), h = FLEET_PRIOR.held, ok = Math.max(0.001, 1 - q - h);
  // Long run: confirm and clean see confirmed and held jobs, instalment sees confirmed and missed.
  const target = bps({ confirm: ok / (1 - q), instalment: ok / (1 - h), held: 1 - ok / (1 - q), strength: 1e9 }, []);
  const fed = federatedPrior(p).prior;
  const outs: CreditOutcome[] = [];
  for (let i = 0; i < Math.max(...JOBS); i++) {
    const u = rand();
    outs.push(u < p.pd_true ? "missed" : u < p.pd_true + FLEET_PRIOR.held ? "held" : "confirmed");
  }
  for (const n of JOBS) {
    const f = bps(FLEET_PRIOR, outs.slice(0, n)) - target, g = bps(fed, outs.slice(0, n)) - target;
    err[n].flat.push(f); err[n].fate.push(g);
    if (n === 0 && p.pd_true >= 0.2) { risky.flat.push(Math.max(0, -f)); risky.fate.push(Math.max(0, -g)); }
    if (n === 0 && p.pd_true < 0.1) { safe.flat.push(Math.max(0, f)); safe.fate.push(Math.max(0, g)); }
  }
}
const mean = (xs: number[]) => Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10;
const mae = (xs: number[]) => mean(xs.map(Math.abs));
const within = (xs: number[]) => Math.round((xs.filter((x) => Math.abs(x) <= 100).length / xs.length) * 1000) / 1000;

const effect = {
  what: "instalment share (bps) the engine recommends for held out new pilots, flat fleet prior vs FATE federated prior, against the share it converges to for that pilot as jobs accrue",
  pilots: test.rows.length, simSeed: SIM_SEED, rateBandBps: band.map((r) => Math.round(r * 10000)),
  modelSha256: FATE_MODEL.sha256,
  rateErrorBps: Object.fromEntries(JOBS.map((n) => [`after_${n}_jobs`, { flat_mae: mae(err[n].flat), fate_mae: mae(err[n].fate), flat_within_100bps: within(err[n].flat), fate_within_100bps: within(err[n].fate) }])),
  atOnboarding: {
    risky_pilots: risky.flat.length, risky_mean_underpricing_bps: { flat: mean(risky.flat), fate: mean(risky.fate) },
    safe_pilots: safe.flat.length, safe_mean_overpricing_bps: { flat: mean(safe.flat), fate: mean(safe.fate) },
    note: "risky: pd_true >= 0.2, the lender's exposure when the share is set too low; safe: pd_true < 0.1, what a good new pilot overpays",
  },
  assumptions: "per job miss probability equals the loan level pd_true; held logs at the fleet rate; synthetic pilots",
};
const resultsPath = path.join(root, "results.json");
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
if (results.model_sha256 !== FATE_MODEL.sha256) throw new Error("web model copy does not match fate/results.json; rerun fate/run.sh");
results.prior_effect = effect;
fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(effect, null, 2));
