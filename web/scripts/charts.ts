// Charts for the README, drawn from the engine on its fixed seeds. Every point is recomputed
// here, nothing is pasted. Writes SVG files to docs/charts. Run: pnpm charts

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { METRICS as PLAUS, DATASET, TRAIN_N, FIT_N, FIXED_THRESHOLD, THRESHOLD, MODEL, MODEL_RAW, TRACK_FEATURES, robustZ, score as scoreFlight, type Flight } from "../src/engine/ml/plausibility";
import { calibrate, exceedRate } from "../src/engine/fusion/conformal";
import { run as stress, DEFAULTS as STRESS } from "../src/engine/economics/stress";
import { solve, DEFAULTS as MDP } from "../src/engine/economics/mdp";
import { run as ratchet } from "../src/engine/ratchet";
import { newState, update, score as creditScore, TIERS, type CreditOutcome } from "../src/engine/credit/score";
import { Cusum } from "../src/engine/drift/cusum";
import { benignScore, attackScore, EVAL_SEED, BENIGN_N, ATTACK_N } from "../src/engine/drift/eval";
import { RISK_PARAMS } from "../src/engine/drift/monitor";
import { classify, rng, SEED as GATE_SEED, HOLD_OUT } from "../src/engine/ml/gate";
import { CORPUS } from "../src/engine/ml/corpus";

const OUT = join(__dirname, "..", "..", "docs", "charts");
const C = { red: "#c8102e", gold: "#d4a017", ink: "#1a1a1a", muted: "#8a8a8a", grey: "#b9b9b9", slate: "#3366cc", paper: "#ffffff", grid: "#ececec" };

type Pt = [number, number];
interface Series { kind: "line" | "dots" | "bars" | "hline" | "vline"; pts?: Pt[]; v?: number; color: string; label?: string; width?: number; dash?: string; r?: number; hollow?: boolean; barW?: number }
interface Note { x: number; y: number; text: string; color?: string; anchor?: "start" | "middle" | "end"; dx?: number; dy?: number }
interface Spec { file: string; title: string; subtitle: string; xLabel: string; yLabel: string; x: [number, number]; y: [number, number]; xTicks: number[]; yTicks: number[]; xFmt?: (v: number) => string; yFmt?: (v: number) => string; series: Series[]; notes?: Note[]; xTickLabels?: Record<number, string> }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function chart(s: Spec) {
  const W = 760, H = 420, L = 72, R = 24, T = 64, B = 56;
  const pw = W - L - R, ph = H - T - B;
  const sx = (v: number) => L + ((v - s.x[0]) / (s.x[1] - s.x[0])) * pw;
  const sy = (v: number) => T + ph - ((v - s.y[0]) / (s.y[1] - s.y[0])) * ph;
  const xf = s.xFmt ?? ((v) => String(v)), yf = s.yFmt ?? ((v) => String(v));
  const o: string[] = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="12">`);
  o.push(`<rect width="${W}" height="${H}" fill="${C.paper}"/>`);
  o.push(`<text x="${L}" y="26" font-size="16" font-weight="600" fill="${C.ink}">${esc(s.title)}</text>`);
  o.push(`<text x="${L}" y="44" fill="${C.muted}">${esc(s.subtitle)}</text>`);
  for (const v of s.yTicks) { const y = sy(v); o.push(`<line x1="${L}" x2="${L + pw}" y1="${y}" y2="${y}" stroke="${C.grid}"/>`); o.push(`<text x="${L - 8}" y="${y + 4}" text-anchor="end" fill="${C.muted}">${esc(yf(v))}</text>`); }
  for (const v of s.xTicks) { const x = sx(v); o.push(`<line x1="${x}" x2="${x}" y1="${T + ph}" y2="${T + ph + 4}" stroke="${C.muted}"/>`); o.push(`<text x="${x}" y="${T + ph + 18}" text-anchor="middle" fill="${C.muted}">${esc(s.xTickLabels?.[v] ?? xf(v))}</text>`); }
  o.push(`<line x1="${L}" x2="${L + pw}" y1="${T + ph}" y2="${T + ph}" stroke="${C.muted}"/>`);
  o.push(`<text x="${L + pw / 2}" y="${H - 14}" text-anchor="middle" fill="${C.muted}">${esc(s.xLabel)}</text>`);
  o.push(`<text transform="translate(16 ${T + ph / 2}) rotate(-90)" text-anchor="middle" fill="${C.muted}">${esc(s.yLabel)}</text>`);
  const clampY = (v: number) => Math.max(s.y[0], Math.min(s.y[1], v));
  for (const se of s.series) {
    if (se.kind === "hline" && se.v !== undefined) o.push(`<line x1="${L}" x2="${L + pw}" y1="${sy(se.v)}" y2="${sy(se.v)}" stroke="${se.color}" stroke-width="${se.width ?? 1}" ${se.dash ? `stroke-dasharray="${se.dash}"` : ""}/>`);
    if (se.kind === "vline" && se.v !== undefined) o.push(`<line x1="${sx(se.v)}" x2="${sx(se.v)}" y1="${T}" y2="${T + ph}" stroke="${se.color}" stroke-width="${se.width ?? 1}" ${se.dash ? `stroke-dasharray="${se.dash}"` : ""}/>`);
    if (se.kind === "line" && se.pts) o.push(`<polyline fill="none" stroke="${se.color}" stroke-width="${se.width ?? 2}" stroke-linejoin="round" stroke-linecap="round" ${se.dash ? `stroke-dasharray="${se.dash}"` : ""} points="${se.pts.map(([x, y]) => `${sx(x).toFixed(1)},${sy(clampY(y)).toFixed(1)}`).join(" ")}"/>`);
    if (se.kind === "dots" && se.pts) for (const [x, y] of se.pts) o.push(`<circle cx="${sx(x).toFixed(1)}" cy="${sy(clampY(y)).toFixed(1)}" r="${se.r ?? 3.5}" fill="${se.hollow ? C.paper : se.color}" stroke="${se.color}" stroke-width="1.5"/>`);
    if (se.kind === "bars" && se.pts) { const bw = ((se.barW ?? 1) / (s.x[1] - s.x[0])) * pw; for (const [x, y] of se.pts) { const x0 = sx(x), y0 = sy(clampY(y)); o.push(`<rect x="${(x0 + 1).toFixed(1)}" y="${y0.toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${(T + ph - y0).toFixed(1)}" fill="${se.color}" rx="2"/>`); } }
  }
  // Legend, top right, inline chips.
  let lx = L + pw;
  for (const se of [...s.series].reverse()) {
    if (!se.label) continue;
    const w = se.label.length * 6.4 + 22;
    lx -= w;
    const thin = se.kind === "line" || se.kind === "hline";
    o.push(`<rect x="${lx}" y="${thin ? T - 15 : T - 20}" width="12" height="${thin ? 3 : 12}" fill="${se.color}" rx="1"/>`);
    o.push(`<text x="${lx + 17}" y="${T - 9}" fill="${C.ink}">${esc(se.label)}</text>`);
    lx -= 10;
  }
  for (const n of s.notes ?? []) o.push(`<text x="${(sx(n.x) + (n.dx ?? 0)).toFixed(1)}" y="${(sy(clampY(n.y)) + (n.dy ?? -8)).toFixed(1)}" text-anchor="${n.anchor ?? "middle"}" fill="${n.color ?? C.ink}" font-weight="600">${esc(n.text)}</text>`);
  o.push("</svg>");
  writeFileSync(join(OUT, s.file), o.join("\n"));
  console.log("wrote", s.file);
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const linspace = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

function main() {
  mkdirSync(OUT, { recursive: true });
  const held = DATASET.slice(TRAIN_N);
  const honest = held.filter((d) => !d.tampered).map((d) => d.flight);
  const tampered = held.filter((d) => d.tampered).map((d) => d.flight);

  // 1. Detection against false alarm, raw track length versus Kalman smoothed, threshold swept.
  {
    const trackTamper = held.filter((d) => d.tampered === "inflated_mu" || d.tampered === "impossible_speed").map((d) => d.flight);
    const rawZ = (f: Flight) => robustZ({ ...f, gps: undefined }, MODEL_RAW, true, TRACK_FEATURES).z;
    const smoothZ = (f: Flight) => robustZ(f, MODEL, false, TRACK_FEATURES).z;
    const hr = honest.map(rawZ), hs = honest.map(smoothZ), tr = trackTamper.map(rawZ), ts = trackTamper.map(smoothZ);
    const PLAUS_RAW_T = PLAUS.rawThreshold;
    const curve = (h: number[], t: number[]): Pt[] => linspace(0.5, 14, 120).map((th) => [exceedRate(h, th), exceedRate(t, th)]);
    chart({
      file: "detection-curve.svg", title: "Tamper detection against false alarms on honest flights",
      subtitle: `${honest.length} honest and ${trackTamper.length} track tampered flights held out, threshold swept from 0.5 to 14 on the two track features`,
      xLabel: "honest flights flagged", yLabel: "tampered flights caught", x: [0, 0.2], y: [0, 1], xTicks: [0, 0.05, 0.1, 0.15, 0.2], yTicks: [0, 0.2, 0.4, 0.6, 0.8, 1], xFmt: pct, yFmt: pct,
      series: [
        { kind: "line", pts: curve(hr, tr), color: C.grey, label: "raw GPS track length", width: 2.5 },
        { kind: "line", pts: curve(hs, ts), color: C.red, label: "Kalman smoothed", width: 2.5 },
        { kind: "dots", pts: [[exceedRate(hs, FIXED_THRESHOLD), exceedRate(ts, FIXED_THRESHOLD)]], color: C.gold, r: 5, label: "z 4 on the smoothed track" },
      ],
      notes: [
        { x: 0.005, y: 0.8, text: `smoothed: ${pct(exceedRate(ts, FIXED_THRESHOLD))} caught at ${(exceedRate(hs, FIXED_THRESHOLD) * 100).toFixed(1)}% false alarm`, anchor: "start", color: C.red },
        { x: 0.005, y: 0.72, text: `raw: ${pct(exceedRate(tr, PLAUS_RAW_T))} caught at ${(exceedRate(hr, PLAUS_RAW_T) * 100).toFixed(1)}% false alarm`, anchor: "start", color: C.muted },
      ],
    });
  }

  // 2. Robust z on the held out set, honest against tampered, with both thresholds.
  {
    const bin = 0.25, maxZ = 12;
    const hist = (fs: Flight[]): Pt[] => { const c = new Map<number, number>(); for (const f of fs) { const z = Math.min(maxZ - bin, robustZ(f).z); const b = Math.floor(z / bin) * bin; c.set(b, (c.get(b) ?? 0) + 1); } return [...c.entries()].sort((a, b) => a[0] - b[0]); };
    const top = Math.ceil(Math.max(...hist(honest).map((p) => p[1]), ...hist(tampered).map((p) => p[1])) / 30) * 30;
    chart({
      file: "z-distribution.svg", title: "Largest robust z per flight, honest against tampered",
      subtitle: `${honest.length} honest and ${tampered.length} tampered flights held out; flights past ${maxZ} are shown in the last bin`,
      xLabel: "largest absolute robust z over five features", yLabel: "flights", x: [0, maxZ], y: [0, top], xTicks: [0, 2, 4, 6, 8, 10, 12], yTicks: linspace(0, top, top / 30 + 1),
      series: [
        { kind: "bars", pts: hist(honest), color: C.grey, barW: bin, label: "honest" },
        { kind: "bars", pts: hist(tampered), color: C.red, barW: bin, label: "tampered" },
        { kind: "vline", v: THRESHOLD, color: C.gold, width: 2, label: `conformal ${THRESHOLD.toFixed(2)}` },
        { kind: "vline", v: FIXED_THRESHOLD, color: C.muted, dash: "4 4", label: "fixed 4" },
      ],
    });
  }

  // 3. Conformal calibration: target false alarm against what the held out set gave.
  {
    const cal = DATASET.slice(FIT_N, TRAIN_N).filter((d) => !d.tampered).map((d) => robustZ(d.flight).z);
    const targets = [0.005, 0.01, 0.02, 0.03, 0.05, 0.075, 0.1, 0.15];
    const pts: Pt[] = targets.map((a) => { const t = calibrate(cal, a).threshold; return [a, honest.filter((f) => !scoreFlight(f, t).ok).length / honest.length]; });
    const det: Pt[] = targets.map((a) => { const t = calibrate(cal, a).threshold; return [a, tampered.filter((f) => !scoreFlight(f, t).ok).length / tampered.length]; });
    const allCaught = det.every(([, d]) => d === 1);
    chart({
      file: "conformal-calibration.svg", title: "Conformal threshold: stated false alarm rate against the held out rate",
      subtitle: `${cal.length} honest calibration flights set the threshold; ${honest.length} held out honest flights test it${allCaught ? "; detection stays at 100% at every target" : ""}`,
      xLabel: "target false alarm rate", yLabel: "held out false alarm rate", x: [0, 0.16], y: [0, 0.2], xTicks: [0, 0.05, 0.1, 0.15], yTicks: [0, 0.05, 0.1, 0.15, 0.2], xFmt: (v) => `${(v * 100).toFixed(v < 0.01 ? 1 : 0)}%`, yFmt: pct,
      series: [
        { kind: "line", pts: [[0, 0], [0.16, 0.16]], color: C.grey, dash: "4 4", label: "stated equals measured" },
        { kind: "line", pts, color: C.red, width: 2.5, label: "measured" },
        { kind: "dots", pts, color: C.red },
        { kind: "dots", pts: [pts[2]], color: C.gold, r: 6, label: "the 2% target in use" },
      ],
      notes: [{ x: 0.02, y: pts[2][1], text: `${(pts[2][1] * 100).toFixed(1)}% at a 2% target`, anchor: "start", dy: -12 }],
    });
  }

  // 4. Lender loss given default, p95, as the pilot's instalment skip rate rises.
  {
    const skips = [0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.14];
    const runs = skips.map((s) => stress(STRESS.seed, { skipPerWeek: s }));
    chart({
      file: "lender-loss.svg", title: "Lender loss given default, p95, as instalment skips rise",
      subtitle: `${STRESS.seasons} seeded seasons per point, 3 skips in a season is a default, drone resale at 55% decaying 0.5% a week`,
      xLabel: "chance a working week's instalment is skipped", yLabel: "p95 loss given default, yuan", x: [0.02, 0.14], y: [10000, 30000], xTicks: skips, yTicks: [10000, 15000, 20000, 25000, 30000], xFmt: pct, yFmt: (v) => v.toLocaleString("en-US"),
      series: [
        { kind: "line", pts: runs.map((r, i) => [skips[i], r.lgdWithoutBonds.p95]), color: C.grey, width: 2.5, label: "no bonds" },
        { kind: "line", pts: runs.map((r, i) => [skips[i], r.lgdWithBonds.p95]), color: C.red, width: 2.5, label: "pilot and vendor bonds" },
        { kind: "dots", pts: runs.map((r, i) => [skips[i], r.lgdWithoutBonds.p95]), color: C.grey },
        { kind: "dots", pts: runs.map((r, i) => [skips[i], r.lgdWithBonds.p95]), color: C.red },
      ],
      notes: runs.map((r, i) => ({ x: skips[i], y: 10000, text: `default ${pct(r.defaultProbability)}`, color: C.muted, dy: -6, anchor: i === 0 ? "start" : i === runs.length - 1 ? "end" : "middle" })),
    });
  }

  // 5. Lease MDP against the greedy rule across the amount still owed.
  {
    const balances = [6000, 9000, 12000, 15000, 18000];
    const sols = balances.map((b) => solve({ leaseBalance: b }));
    const vals = sols.flatMap((s) => [s.comparison.greedy.meanProfit, s.comparison.mdp.meanProfit]);
    const yLo = Math.floor(Math.min(...vals) / 500) * 500 - 500, yHi = Math.ceil(Math.max(...vals) / 500) * 500 + 500;
    chart({
      file: "mdp-vs-greedy.svg", title: "Mean season profit after instalments, MDP policy against the greedy rule",
      subtitle: `${MDP.seasons} seeded seasons of ${MDP.horizon} weeks per point, common random numbers, value iteration over ${sols[2].states.toLocaleString("en-US")} states at the 12,000 yuan balance`,
      xLabel: "lease balance still owed at the start of the season, yuan", yLabel: "mean profit, yuan", x: [6000, 18000], y: [yLo, yHi], xTicks: balances, yTicks: linspace(yLo, yHi, (yHi - yLo) / 500 + 1), xFmt: (v) => v.toLocaleString("en-US"), yFmt: (v) => v.toLocaleString("en-US"),
      series: [
        { kind: "line", pts: sols.map((s, i) => [balances[i], s.comparison.greedy.meanProfit]), color: C.grey, width: 2.5, label: "greedy rule" },
        { kind: "line", pts: sols.map((s, i) => [balances[i], s.comparison.mdp.meanProfit]), color: C.red, width: 2.5, label: "MDP policy" },
        { kind: "dots", pts: sols.map((s, i) => [balances[i], s.comparison.greedy.meanProfit]), color: C.grey },
        { kind: "dots", pts: sols.map((s, i) => [balances[i], s.comparison.mdp.meanProfit]), color: C.red },
      ],
      notes: sols.map((s, i) => ({ x: balances[i], y: s.comparison.mdp.meanProfit, text: `+${Math.round(s.comparison.advantage)} yuan`, color: C.red, dy: -10, anchor: i === 0 ? "start" : i === sols.length - 1 ? "end" : "middle" })),
    });
  }

  // 6. The ratchet walk: every proposal, what was kept, the best so far.
  {
    const r = ratchet(60);
    let best = r.baselineProfit; const bestLine: Pt[] = [[0, best]];
    for (const s of r.steps) { if (s.kept) best = s.profit; bestLine.push([s.step, best]); }
    const lo = Math.min(...r.steps.filter((s) => !s.violation).map((s) => s.profit), r.baselineProfit);
    chart({
      file: "ratchet.svg", title: "The acceptance ratchet over 60 proposals on a frozen week",
      subtitle: `walk seed ${r.walkSeed}, eval seed ${r.evalSeed}, ${r.offers} offers over ${r.days} days; a proposal is kept only if profit rises and the reserve rule holds`,
      xLabel: "proposal", yLabel: "profit after instalments, yuan", x: [0, 60], y: [Math.floor(Math.min(0, lo) / 100) * 100, Math.ceil(r.bestProfit / 100) * 100 + 100], xTicks: [0, 10, 20, 30, 40, 50, 60], yTicks: linspace(Math.floor(Math.min(0, lo) / 100) * 100, Math.ceil(r.bestProfit / 100) * 100 + 100, 6).map(Math.round), yFmt: (v) => v.toLocaleString("en-US"),
      series: [
        { kind: "hline", v: r.baselineProfit, color: C.grey, dash: "4 4", label: `baseline ${Math.round(r.baselineProfit)}` },
        { kind: "line", pts: bestLine, color: C.red, width: 2.5, label: "best so far" },
        { kind: "dots", pts: r.steps.filter((s) => !s.kept && !s.violation).map((s) => [s.step, s.profit]), color: C.grey, r: 3, label: "rejected" },
        { kind: "dots", pts: r.steps.filter((s) => s.violation).map((s) => [s.step, Math.max(s.profit, Math.min(0, lo))]), color: C.muted, r: 3, hollow: true, label: "broke the reserve rule" },
        { kind: "dots", pts: r.steps.filter((s) => s.kept).map((s) => [s.step, s.profit]), color: C.gold, r: 5, label: "kept" },
      ],
      notes: [{ x: 60, y: r.bestProfit, text: `${Math.round(r.bestProfit)} yuan`, anchor: "end", dy: -10, color: C.red }],
    });
  }

  // 7. Three pilots' credit scores over thirty jobs.
  {
    const walk = (outs: CreditOutcome[]): Pt[] => { let st = newState(); const pts: Pt[] = [[0, creditScore(st).p]]; outs.forEach((o, i) => { st = update(st, o); pts.push([i + 1, creditScore(st).p]); }); return pts; };
    const reliable = Array<CreditOutcome>(30).fill("confirmed");
    const oneHeld = reliable.map((o, i) => (i === 9 ? "held" : o)) as CreditOutcome[];
    const flaky = reliable.map((o, i) => (i % 5 === 4 ? "held" : i === 20 ? "missed" : o)) as CreditOutcome[];
    chart({
      file: "credit.svg", title: "Pilot credit score as history arrives, Buhlmann credibility",
      subtitle: "fleet prior strength 8; the score only moves the instalment share inside the policy band of 20 to 45%",
      xLabel: "jobs completed", yLabel: "credit score", x: [0, 30], y: [0.8, 1], xTicks: [0, 5, 10, 15, 20, 25, 30], yTicks: [0.8, 0.85, 0.9, 0.95, 1],
      series: [
        ...TIERS.filter(([, v]) => v > 0.8).map(([, v]): Series => ({ kind: "hline", v, color: C.grid, width: 1.5 })),
        { kind: "line", pts: walk(reliable), color: C.red, width: 2.5, label: "every job confirmed" },
        { kind: "line", pts: walk(oneHeld), color: C.gold, width: 2.5, label: "one held log at job 10" },
        { kind: "line", pts: walk(flaky), color: C.grey, width: 2.5, label: "a held log every fifth job, one missed instalment" },
      ],
      notes: TIERS.filter(([, v]) => v > 0.8).map(([t, v]) => ({ x: 30, y: v, text: `tier ${t}`, color: C.muted, anchor: "end", dy: 14 })),
    });
  }

  // 8. CUSUM on the classifier's risk score: 500 benign, then attacks.
  {
    const r = rng(EVAL_SEED); const c = new Cusum(RISK_PARAMS);
    const risk: Pt[] = [], s: Pt[] = []; let alarmAt: number | null = null;
    const SHOW = BENIGN_N + 40;
    for (let i = 0; i < Math.min(BENIGN_N + ATTACK_N, SHOW); i++) {
      const x = i < BENIGN_N ? benignScore(r) : attackScore(r);
      const o = c.observe(x);
      risk.push([i, x]); s.push([i, o.s]);
      if (o.alarm && alarmAt === null) alarmAt = i;
    }
    chart({
      file: "cusum.svg", title: "CUSUM drift monitor on the classifier's risk score",
      subtitle: `target ${RISK_PARAMS.target}, slack k ${RISK_PARAMS.k}, alarm at h ${RISK_PARAMS.h}; the mean shifts at observation ${BENIGN_N}, the alarm fires at ${alarmAt}; the sum resets after each alarm`,
      xLabel: "observation", yLabel: "risk score and CUSUM statistic", x: [0, SHOW], y: [0, 2.2], xTicks: [0, 100, 200, 300, 400, 500], yTicks: [0, 0.5, 1, 1.5, 2],
      series: [
        { kind: "dots", pts: risk, color: C.grey, r: 1.5, label: "risk score" },
        { kind: "line", pts: s, color: C.red, width: 2, label: "CUSUM statistic" },
        { kind: "hline", v: RISK_PARAMS.h, color: C.gold, dash: "4 4", width: 2, label: "alarm line h" },
        { kind: "vline", v: BENIGN_N, color: C.muted, dash: "2 3", label: "shift" },
      ],
      notes: alarmAt !== null ? [{ x: alarmAt, y: RISK_PARAMS.h, text: `alarm ${alarmAt - BENIGN_N} observations after the shift`, anchor: "end", dy: -10, color: C.red }] : [],
    });
  }

  // 9. The classifier at every threshold on the held out messages.
  {
    const r = rng(GATE_SEED);
    const idx = CORPUS.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const test = idx.slice(0, Math.round(idx.length * HOLD_OUT)).map((i) => ({ p: classify(CORPUS[i].text).p, y: CORPUS[i].label === "attack" }));
    const ths = linspace(0.05, 0.95, 37);
    const at = (th: number) => { let tp = 0, fp = 0, tn = 0, fn = 0; for (const t of test) { const pred = t.p > th; if (pred && t.y) tp++; else if (pred && !t.y) fp++; else if (!pred && !t.y) tn++; else fn++; } return { recall: tp / (tp + fn), fa: fp / (fp + tn), acc: (tp + tn) / test.length }; };
    const rows = ths.map((th) => ({ th, ...at(th) }));
    chart({
      file: "classifier-threshold.svg", title: "Message classifier on the held out set at every threshold",
      subtitle: `${test.length} of ${CORPUS.length} messages held out by seed ${GATE_SEED}; 0.5 labels, 0.8 is where the gate holds a message for the operator`,
      xLabel: "threshold on the attack probability", yLabel: "rate", x: [0, 1], y: [0, 1], xTicks: [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1], yTicks: [0, 0.2, 0.4, 0.6, 0.8, 1], yFmt: pct,
      series: [
        { kind: "line", pts: rows.map((x) => [x.th, x.recall]), color: C.red, width: 2.5, label: "attacks caught" },
        { kind: "line", pts: rows.map((x) => [x.th, x.acc]), color: C.gold, width: 2.5, label: "accuracy" },
        { kind: "line", pts: rows.map((x) => [x.th, x.fa]), color: C.grey, width: 2.5, label: "benign held" },
        { kind: "vline", v: 0.5, color: C.muted, dash: "2 3" },
        { kind: "vline", v: 0.8, color: C.muted, dash: "2 3" },
      ],
    });
  }
}

main();
