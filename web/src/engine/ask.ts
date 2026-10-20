// Ask the agent about a declined job. A small, stateless dialogue: the pilot asks why, the agent
// explains from the engine's own numbers and asks one clarifying question, the pilot corrects
// (accept the break even rate, propose another rate, ask to lower the reserve, or keep it
// declined) and the agent recomputes through the same economics() and planner the run used.
// Every number and every decision here comes from code. The model, when a key is set, may only
// rephrase the explanation sentence in the route, and its text is checked against these facts.

import { economics } from "./agents";
import { plan, type PlanReason } from "./planner";
import { DEMO, TIERS } from "./policy";
import type { Lang } from "./i18n";
import type { Economics } from "./types";

export type AskAction = "why" | "accept_counter" | "propose" | "lower_reserve" | "decline" | "text";
export interface AskJob { id: string; title: string; mu: number; fee: number; distanceM?: number }
export interface AskRequest { lang: Lang; job: AskJob; action: AskAction; rate?: number; text?: string }
export interface AskChoice { action: AskAction; rate?: number; label: string }
export type AskKind = "explain" | "decision" | "refused" | "out_of_scope" | "closed";
export interface AskReply {
  kind: AskKind;
  action: AskAction; // the action the agent understood, after reading free text
  text: string;
  question: string | null;
  choices: AskChoice[];
  decision: "accept" | "decline" | "refused" | null;
  rule: string | null; // the rule that decided or refused
  facts: Record<string, number | boolean>;
}

export class AskError extends Error {}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r1 = (n: number) => Math.round(n * 10) / 10;
export const MAX_RATE = 100; // yuan per mu; anything above is treated as a typo

// The economics the fleet run uses for a job: lease rate, energy per mu and the reserve rule from DEMO.
export function ecoFor(fee: number, mu: number): Economics {
  return economics(fee, DEMO.leaseRate, r2(mu * DEMO.energyPerMu), DEMO.reserveRule);
}

// One job through the same knapsack planner as the run, so a correction passes the same hard
// filters (reserve rule, window, battery budget) the day plan applied.
export function assess(job: AskJob, rate: number): { rate: number; eco: Economics; why: PlanReason; accepted: boolean; budgetMu: number } {
  const fee = r2(job.mu * rate);
  const p = plan({
    jobs: [{ id: job.id, title: job.title, fee, mu: job.mu, distanceM: job.distanceM ?? 0, windowMin: DEMO.dayMinutes }],
    budgetMu: DEMO.budgetMu, charges: DEMO.chargesPerDay, dayMinutes: DEMO.dayMinutes, eco: ecoFor, reason: () => "",
  });
  const item = p.items[0];
  return { rate, eco: ecoFor(fee, job.mu), why: item.why ?? "below", accepted: !!item.accepted, budgetMu: Math.floor(DEMO.budgetMu * DEMO.chargesPerDay) };
}

// The lowest rate, in steps of 0.1 yuan per mu, at which the job clears the reserve rule.
export function breakEven(mu: number): number {
  let r = 0.1;
  while (!ecoFor(r2(mu * r), mu).clears && r < MAX_RATE) r = r1(r + 0.1);
  return r;
}

export function validJob(v: unknown): AskJob {
  const j = (v ?? {}) as Record<string, unknown>;
  const mu = Number(j.mu), fee = Number(j.fee), distanceM = j.distanceM === undefined ? undefined : Number(j.distanceM);
  if (!Number.isFinite(mu) || mu <= 0 || mu > 10_000) throw new AskError("job.mu must be a number above 0 and at most 10000");
  if (!Number.isFinite(fee) || fee < 0 || fee > 1_000_000) throw new AskError("job.fee must be a number from 0 to 1000000");
  if (distanceM !== undefined && (!Number.isFinite(distanceM) || distanceM < 0 || distanceM > 100_000)) throw new AskError("job.distanceM out of range");
  const id = typeof j.id === "string" ? j.id.slice(0, 40) : "job";
  const title = typeof j.title === "string" ? j.title.slice(0, 120) : id;
  return { id, title, mu, fee, distanceM };
}

// Free text to an action. Out of scope falls through to "text", which the agent answers with
// the supported questions.
export function readText(text: string): { action: AskAction; rate?: number } {
  const s = text.toLowerCase().slice(0, 300);
  const num = s.match(/\d+(?:\.\d+)?/);
  if (/(reserve|floor|储备|底线|门槛)/.test(s) && /(lower|reduce|drop|cut|waive|降|减|免|取消)/.test(s)) return { action: "lower_reserve" };
  if (/(why|reason|explain|为什么|为何|原因|解释)/.test(s)) return { action: "why" };
  if (num && /(rate|yuan|price|per mu|mu|元|亩|价|费率|accept|take|接|counter|offer|propose)/.test(s)) return { action: "propose", rate: Number(num[0]) };
  if (num && /^\s*\d+(?:\.\d+)?\s*$/.test(s)) return { action: "propose", rate: Number(num[0]) };
  if (/^(no|nope)\b|decline|keep it declined|reject|不接|拒绝|算了|不要/.test(s)) return { action: "decline" };
  if (/^(yes|ok|okay|sure|accept|do it|go ahead)\b|好的?|可以|接受|同意|行/.test(s)) return { action: "accept_counter" };
  return { action: "text" };
}

const L = {
  en: {
    why: "The fee is {fee} yuan ({mu} mu at {rate} yuan per mu). The lease instalment takes {inst} yuan ({pct} percent of the fee), charging costs {energy} yuan and the rail fee is {rail} yuan, which leaves a margin of {margin} yuan. The reserve rule needs at least {rule} yuan per job, so the planner declined it.",
    whyClears: "This job clears: the fee is {fee} yuan and the margin is {margin} yuan, above the {rule} yuan reserve rule. It was not declined for its economics.",
    ask: "The break even is {be} yuan per mu (fee {beFee} yuan, margin {beMargin} yuan). Should I accept it if the farmer raises the rate to {be} yuan per mu?",
    askAgain: "Should I accept it at {be} yuan per mu instead?",
    accept: "Recomputed at {rate} yuan per mu: fee {fee} yuan, instalment {inst} yuan, charging {energy} yuan, rail {rail} yuan, margin {margin} yuan. That is above the {rule} yuan reserve rule. Decision: accept. I will offer the farmer {rate} yuan per mu; nothing is signed until they agree.",
    below: "Recomputed at {rate} yuan per mu: fee {fee} yuan, margin {margin} yuan. That is still below the {rule} yuan reserve rule. Decision: decline. The lowest rate that clears is {be} yuan per mu.",
    budget: "Recomputed at {rate} yuan per mu: margin {margin} yuan clears the reserve rule, but {mu} mu does not fit the day's battery budget of {budget} mu. Decision: decline.",
    window: "Recomputed at {rate} yuan per mu: margin {margin} yuan clears the reserve rule, but the flight does not fit the day's {day} minutes. Decision: decline.",
    badRate: "I need a rate above 0 and at most {max} yuan per mu. Which rate should I check?",
    reserve: "I cannot do that. The reserve rule of {rule} yuan per job is the lender's floor, written into the lease terms and enforced by the policy engine. The pilot tier can propose rates but cannot change a rule; a rule change needs the operator key ({tier}, the physical button) and the lender. What does work is a higher rate: {be} yuan per mu clears it.",
    decline: "Understood. The job stays declined. Nothing was signed and the farmer keeps the {fee} yuan.",
    scope: "I can only help with this declined job: why it was declined, which rate would clear it, and whether a rule can change. Pick one of these.",
    cWhy: "Why was this job declined?", cAccept: "Accept at {be} yuan per mu", cReserve: "Lower the reserve for this job", cDecline: "Keep it declined",
  },
  zh: {
    why: "费用为 {fee} 元（{mu} 亩，每亩 {rate} 元）。租赁分期款占 {inst} 元（费用的 {pct}%），充电成本 {energy} 元，通道费 {rail} 元，剩余利润 {margin} 元。储备规则要求每单至少 {rule} 元，所以规划器拒绝了这单。",
    whyClears: "这单达标：费用 {fee} 元，利润 {margin} 元，高于 {rule} 元的储备规则。它不是因为经济性被拒绝的。",
    ask: "保本价是每亩 {be} 元（费用 {beFee} 元，利润 {beMargin} 元）。如果农户把价格提到每亩 {be} 元，要我接下这单吗？",
    askAgain: "改为按每亩 {be} 元接单可以吗？",
    accept: "按每亩 {rate} 元重新计算：费用 {fee} 元，分期款 {inst} 元，充电 {energy} 元，通道费 {rail} 元，利润 {margin} 元，高于 {rule} 元的储备规则。决定：接单。我会向农户报价每亩 {rate} 元，农户同意前不会签署任何东西。",
    below: "按每亩 {rate} 元重新计算：费用 {fee} 元，利润 {margin} 元，仍低于 {rule} 元的储备规则。决定：拒绝。能达标的最低价格是每亩 {be} 元。",
    budget: "按每亩 {rate} 元重新计算：利润 {margin} 元达到储备规则，但 {mu} 亩超出当天 {budget} 亩的电池预算。决定：拒绝。",
    window: "按每亩 {rate} 元重新计算：利润 {margin} 元达到储备规则，但飞行时间超出当天的 {day} 分钟。决定：拒绝。",
    badRate: "我需要一个大于 0、不超过每亩 {max} 元的价格。要我按哪个价格计算？",
    reserve: "这个我不能做。每单 {rule} 元的储备规则是出租方的底线，写在租赁条款里，由策略引擎执行。飞手权限可以提出价格，但不能修改规则；修改规则需要操作员密钥（{tier}，实体按钮）和出租方同意。可行的办法是提高价格：每亩 {be} 元即可达标。",
    decline: "明白。这单维持拒绝。没有签署任何东西，农户的 {fee} 元原样退回。",
    scope: "我只能回答这单被拒任务的问题：为什么被拒、什么价格能达标、规则能否修改。请从下面选一个。",
    cWhy: "这单为什么被拒？", cAccept: "按每亩 {be} 元接单", cReserve: "为这单降低储备", cDecline: "维持拒绝",
  },
};

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? `{${k}}`));

// The deterministic answer. The route may rephrase `text` for the "why" explanation only.
export function answer(req: AskRequest): AskReply {
  const job = validJob(req.job);
  const S = L[req.lang === "zh" ? "zh" : "en"];
  let action = req.action;
  let rate = req.rate;
  if (action === "text") { const r = readText(req.text ?? ""); action = r.action; rate = r.rate; }

  const be = breakEven(job.mu);
  const beEco = ecoFor(r2(job.mu * be), job.mu);
  const now = assess(job, r2(job.fee / job.mu));
  const base = { be, beFee: beEco.fee, beMargin: beEco.margin, rule: DEMO.reserveRule, mu: job.mu, pct: r2(DEMO.leaseRate * 100), budget: now.budgetMu, day: DEMO.dayMinutes, max: MAX_RATE, tier: "L3" };
  const ecoVars = (a: ReturnType<typeof assess>) => ({ rate: a.rate, fee: a.eco.fee, inst: a.eco.instalment, energy: a.eco.energy, rail: a.eco.rail, margin: a.eco.margin });
  const ecoFacts = (a: ReturnType<typeof assess>) => ({ ...ecoVars(a), mu: job.mu, rule: DEMO.reserveRule, breakEven: be, leaseSharePct: base.pct, clears: a.eco.clears });
  const counter: AskChoice[] = [
    { action: "accept_counter", rate: be, label: fill(S.cAccept, base) },
    { action: "lower_reserve", label: S.cReserve },
    { action: "decline", label: S.cDecline },
  ];
  const reply = (r: Omit<AskReply, "action">): AskReply => ({ ...r, action });

  if (action === "why") {
    if (now.eco.clears) return reply({ kind: "explain", text: fill(S.whyClears, { ...base, ...ecoVars(now) }), question: null, choices: [], decision: null, rule: "reserve rule", facts: ecoFacts(now) });
    return reply({ kind: "explain", text: fill(S.why, { ...base, ...ecoVars(now) }), question: fill(S.ask, base), choices: counter, decision: null, rule: "reserve rule", facts: { ...ecoFacts(now), beFee: beEco.fee, beMargin: beEco.margin } });
  }
  if (action === "accept_counter" || action === "propose") {
    const want = action === "accept_counter" ? be : Number(rate);
    if (!Number.isFinite(want) || want <= 0 || want > MAX_RATE) return reply({ kind: "refused", text: fill(S.badRate, base), question: fill(S.askAgain, base), choices: counter, decision: "refused", rule: "rate range", facts: { max: MAX_RATE, breakEven: be } });
    const a = assess(job, r2(want));
    const vars = { ...base, ...ecoVars(a) };
    if (a.accepted) return reply({ kind: "decision", text: fill(S.accept, vars), question: null, choices: [{ action: "why", label: S.cWhy }], decision: "accept", rule: "reserve rule", facts: ecoFacts(a) });
    const key = a.why === "budget" ? "budget" : a.why === "window" ? "window" : "below";
    return reply({ kind: "decision", text: fill(S[key], vars), question: key === "below" ? fill(S.askAgain, base) : null, choices: key === "below" ? counter : [{ action: "decline", label: S.cDecline }], decision: "decline", rule: key === "below" ? "reserve rule" : key === "budget" ? "battery budget" : "day window", facts: ecoFacts(a) });
  }
  if (action === "lower_reserve") {
    const tier = TIERS.find((x) => x.tier === "L3")!;
    return reply({ kind: "refused", text: fill(S.reserve, { ...base, tier: tier.tier }), question: fill(S.askAgain, base), choices: counter.filter((c) => c.action !== "lower_reserve"), decision: "refused", rule: "reserve rule (lender floor, L3 only)", facts: { rule: DEMO.reserveRule, breakEven: be } });
  }
  if (action === "decline") return reply({ kind: "closed", text: fill(S.decline, { ...base, fee: job.fee }), question: null, choices: [{ action: "why", label: S.cWhy }], decision: "decline", rule: null, facts: { fee: job.fee } });
  return reply({ kind: "out_of_scope", text: S.scope, question: null, choices: [{ action: "why", label: S.cWhy }, ...counter], decision: null, rule: null, facts: {} });
}
