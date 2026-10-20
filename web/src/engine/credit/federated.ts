// A federated prior for the pilot credit score. Three lenders trained a pilot default model
// together with WeBank's FATE (homo logistic regression, FedAvg with secure aggregation), each
// keeping its repayment records in house; fate/experiment.py runs it and writes fate/model.json,
// copied here as fate-model.json. This module only reads the exported coefficients: the live
// app never calls FATE at runtime.
//
// The model turns a pilot's onboarding profile into a default probability pd, and the prior on
// the instalment component starts at 1 - pd instead of the flat fleet rate. The credibility
// weighting is unchanged: the prior counts as k jobs, so the pilot's own record takes over as
// jobs come in. Without a valid model the flat fleet prior is used, exactly as before. Money
// still moves only through the policy's rate band and rateFor in score.ts.
import raw from "./fate-model.json";
import { FLEET_PRIOR, type CreditPrior } from "./score";

export interface PilotProfile {
  tenure_years: number;
  mu_last_season: number; // thousand mu sprayed last season
  held_log_rate: number;
  slash_count: number;
  down_payment_share: number;
  peak_income_share: number;
}
export interface FateFeature { name: keyof PilotProfile; transform: "identity" | "log1p"; center: number; scale: number }
export interface FateModel { fate_version: string; coef: number[]; intercept: number; features: FateFeature[]; sha256: string; checks: { features: PilotProfile; fate_pd: number }[] }
export interface FederatedPrior { prior: CreditPrior; source: "fate" | "flat"; pd: number | null; modelSha256: string | null; fateVersion: string | null }

const NAMES: (keyof PilotProfile)[] = ["tenure_years", "mu_last_season", "held_log_rate", "slash_count", "down_payment_share", "peak_income_share"];
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// Returns null on anything malformed, so a missing or broken export falls back to the flat prior.
export function parseModel(m: unknown): FateModel | null {
  const o = m as Partial<FateModel> | null;
  if (!o || !Array.isArray(o.coef) || !Array.isArray(o.features) || !num(o.intercept) || typeof o.sha256 !== "string") return null;
  if (o.coef.length !== o.features.length || !o.coef.every(num)) return null;
  const ok = o.features.every((f) => NAMES.includes(f.name) && (f.transform === "identity" || f.transform === "log1p") && num(f.center) && num(f.scale) && f.scale !== 0);
  return ok ? (o as FateModel) : null;
}

export const FATE_MODEL: FateModel | null = parseModel(raw);

// pd = sigmoid(intercept + sum coef_i * (f_i(x_i) - center_i) / scale_i), the same formula
// FATE's HomoLR applies to the scaled rows it was trained on.
export function federatedPd(profile: PilotProfile, model: FateModel): number {
  let z = model.intercept;
  model.features.forEach((f, i) => {
    const x = profile[f.name];
    const v = f.transform === "log1p" ? Math.log1p(x) : x;
    z += model.coef[i] * ((v - f.center) / f.scale);
  });
  return 1 / (1 + Math.exp(-z));
}

// The prior a new pilot starts from. Only the instalment component moves: its mean is the
// federated probability of paying, kept inside [0.5, 0.995] so one profile cannot pin it.
export function federatedPrior(profile: PilotProfile, model: FateModel | null = FATE_MODEL, base: CreditPrior = FLEET_PRIOR): FederatedPrior {
  if (!model) return { prior: base, source: "flat", pd: null, modelSha256: null, fateVersion: null };
  const pd = federatedPd(profile, model);
  const instalment = Math.min(0.995, Math.max(0.5, 1 - pd));
  return { prior: { ...base, instalment }, source: "fate", pd: Math.round(pd * 1e6) / 1e6, modelSha256: model.sha256, fateVersion: model.fate_version };
}

// The demo pilot: a second season pilot on a new hire purchase, no history with this lender.
export const DEMO_PILOT_PROFILE: PilotProfile = { tenure_years: 1.5, mu_last_season: 4.5, held_log_rate: 0.06, slash_count: 0, down_payment_share: 0.25, peak_income_share: 0.65 };
