"use client";
import type { EngineEvent } from "@/engine/types";
import { timeOf, yuan } from "./money";
import { translate, useLang, type Lang } from "@/i18n/LangProvider";
import { ruleLabel } from "@/engine/i18n";

// The live demo as five moments, in order. Each lights once from the event stream and keeps a one line caption.
export type MomentKey = "declined" | "instalment" | "held" | "slash" | "title";
export type Moment = { key: MomentKey; label: string; at?: number; text?: string };

const KEYS: MomentKey[] = ["declined", "instalment", "held", "slash", "title"];

export function momentsOf(events: EngineEvent[], lang: Lang = "en"): Moment[] {
  const t = (k: Parameters<typeof translate>[1], v?: Parameters<typeof translate>[2]) => translate(lang, k, v);
  const found: Partial<Record<MomentKey, { at: number; text: string }>> = {};
  const hit = (k: MomentKey, at: number, text: string) => { if (!found[k]) found[k] = { at, text }; };
  const eco: Record<string, { margin?: number; reserveRule?: number; clears?: boolean }> = {};
  for (const e of events) {
    const r = e as unknown as Record<string, unknown> & { t: string; at: number };
    switch (e.t) {
      case "economics": eco[e.jobId] = e.eco; break;
      case "job": {
        const j = e.job;
        if (j.status === "declined") {
          const x = eco[j.id];
          hit("declined", e.at, x && x.clears === false ? t("moments.declinedEco", { title: j.title, margin: yuan(x.margin), rule: yuan(x.reserveRule) }) : t("moments.declinedPolicy", { title: j.title }));
        }
        if (j.status === "held") hit("held", e.at, t("moments.heldJob", { title: j.title }));
        break;
      }
      case "telemetry": if (!e.ok) hit("held", e.at, t("moments.heldTele", { claimed: e.claimedMu, area: e.areaMu })); break;
      case "proof": {
        const bond = typeof r.bond === "string" ? r.bond : typeof r.bondKind === "string" ? r.bondKind : "vendor";
        hit("slash", e.at, t("moments.slashProof", { rule: ruleLabel(lang, e.rule), amount: yuan(e.slash), bond: t(bond === "pilot" ? "moments.pilot" : "moments.vendor") }));
        break;
      }
      case "chain": {
        const tx = e.tx;
        if (tx.kind === "instalment") hit("instalment", e.at, t("moments.instalmentTx", { amount: yuan(tx.amount) }));
        if (tx.kind === "slash") hit("slash", e.at, t("moments.slashTx", { amount: yuan(tx.amount) }));
        if (tx.kind === "title") hit("title", e.at, t("moments.titleTx"));
        break;
      }
    }
  }
  return KEYS.map((key) => ({ key, label: t(`moments.${key}`), ...found[key] }));
}

export function Moments({ moments, active, onSelect }: { moments: Moment[]; active: MomentKey | null; onSelect: (k: MomentKey) => void }) {
  const { t } = useLang();
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label={t("moments.aria")}>
      {moments.map((m, i) => {
        const lit = typeof m.at === "number";
        return (
          <li key={m.key}>
            <button type="button" disabled={!lit} onClick={() => onSelect(m.key)} data-lit={lit} data-active={active === m.key} aria-pressed={active === m.key} className="moment cut-sm w-full text-left px-3 py-2 transition-colors duration-300">
              <div className="mono text-[10px]">{String(i + 1).padStart(2, "0")} {lit ? timeOf(m.at) : t("moments.waiting")}</div>
              <div className="tech text-sm font-bold uppercase tracking-wide">{m.label}</div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
