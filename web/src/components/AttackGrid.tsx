"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/i18n/LangProvider";
import { layerLabel, standardLabel } from "@/engine/i18n";

export type AttackResult = { id: number; name: string; nameZh?: string; layer: string; blocked: boolean; detail: string; detailZh?: string; naive?: boolean | "fell" | "held"; standard?: string; isolated?: boolean };

// One tile per case. Two diamonds: JiXin on the left, a naive wallet on the right. Click for the reason.
export function AttackGrid({ results: raw, benign }: { results: AttackResult[]; benign?: { passed: number; total: number } }) {
  const [open, setOpen] = useState<number | null>(null);
  const { d, t, lang } = useLang();
  const G = d.grid;
  const results = raw.map((r) => ({ ...r, naive: r.naive === undefined ? undefined : r.naive === true || r.naive === "fell" }));
  const sel = results.find((r) => r.id === open);
  const m = results.length;
  const fell = results.filter((r) => r.naive === true).length;
  const naiveKnown = results.some((r) => r.naive !== undefined);
  const passed = results.filter((r) => !r.blocked).length;
  const name = (r: AttackResult) => (lang === "zh" ? r.nameZh ?? r.name : r.name);
  const detail = (r: AttackResult) => (lang === "zh" ? r.detailZh ?? r.detail : r.detail);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="tile !py-2"><span className="text-muted">{G.naive}</span> <b className="text-red">{t("grid.ofN", { a: naiveKnown ? fell : "?", b: m })}</b> {G.fall}</span>
        <span className="tile !py-2"><span className="text-muted">{G.jixin}</span> <b className={passed ? "text-red" : "text-gold-deep"}>{t("grid.ofN", { a: passed, b: m })}</b> {G.passThrough}</span>
        <span className="tile !py-2"><span className="text-muted">{G.benign}</span> <b>{benign ? t("grid.ofN", { a: benign.passed, b: benign.total }) : G.runSet}</b></span>
        <span className="ml-auto flex items-center gap-3 text-muted"><span className="flex items-center gap-1"><i className="h-2 w-2 rotate-45 bg-gold" />JiXin</span><span className="flex items-center gap-1"><i className="h-2 w-2 rotate-45 border border-red bg-transparent" />{G.legendNaive}</span></span>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-5">
        {results.map((r) => (
          <button key={r.id} type="button" onClick={() => setOpen(open === r.id ? null : r.id)} aria-pressed={open === r.id} className={`cut-sm hover-lift flex items-start gap-2 px-3 py-2 text-left text-sm transition ${open === r.id ? "bg-ink text-white" : "bg-white"}`} style={{ border: `1px solid ${r.isolated ? "#d4a017" : "var(--color-line)"}` }}>
            <span className="mt-1 flex shrink-0 gap-1">
              <span className={`h-2.5 w-2.5 rotate-45 ${r.blocked ? "bg-gold" : "bg-red"}`} aria-label={r.blocked ? G.blocked : G.passed} />
              <span className={`h-2.5 w-2.5 rotate-45 ${r.naive === undefined ? "border border-line" : r.naive ? "bg-red" : "border border-gold"}`} aria-label={r.naive ? G.naiveFalls : G.naiveHolds} />
            </span>
            <span className="min-w-0"><span className="mono block text-[10px] opacity-60">{String(r.id).padStart(2, "0")} {layerLabel(lang, r.layer)}{r.standard ? ` · ${standardLabel(lang, r.standard)}` : ""}{r.isolated ? ` · ${G.isolated}` : ""}</span><span className="block truncate">{name(r)}</span></span>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {sel ? (
          <motion.div key={sel.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="cut-sm mt-3 bg-paper-2 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-3"><span className={`pill ${sel.blocked ? "bg-gold-soft text-red-deep" : "bg-red-soft text-red"}`}>{sel.blocked ? G.blockedPill : G.notBlocked}</span>{sel.naive !== undefined ? <span className={`pill ${sel.naive ? "bg-red text-white" : "bg-paper-2 text-ink-2"}`}>{t("grid.naiveWallet", { s: sel.naive ? G.falls : G.holds })}</span> : null}<span className="font-semibold">{name(sel)}</span><span className="text-muted">{t("grid.atLayer", { layer: layerLabel(lang, sel.layer) })}{sel.standard ? t("grid.standard", { s: standardLabel(lang, sel.standard) }) : ""}</span></div>
            <p className="mt-2 text-ink-2">{detail(sel)}</p>
            {sel.isolated ? <p className="mt-1 text-xs text-muted">{G.isolatedNote}</p> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
      {!results.length ? <div className="text-sm text-muted">{G.none}</div> : null}
    </div>
  );
}
