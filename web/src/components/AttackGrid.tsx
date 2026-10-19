"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type AttackResult = { id: number; name: string; layer: string; blocked: boolean; detail: string; naive?: boolean | "fell" | "held"; standard?: string; isolated?: boolean };

// One tile per case. Two diamonds: Zishi on the left, a naive wallet on the right. Click for the reason.
export function AttackGrid({ results: raw, benign }: { results: AttackResult[]; benign?: { passed: number; total: number } }) {
  const [open, setOpen] = useState<number | null>(null);
  const results = raw.map((r) => ({ ...r, naive: r.naive === undefined ? undefined : r.naive === true || r.naive === "fell" }));
  const sel = results.find((r) => r.id === open);
  const m = results.length;
  const fell = results.filter((r) => r.naive === true).length;
  const naiveKnown = results.some((r) => r.naive !== undefined);
  const passed = results.filter((r) => !r.blocked).length;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[13px]">
        <span className="tile !py-2"><span className="text-muted">naive wallet:</span> <b className="text-red">{naiveKnown ? fell : "?"} of {m}</b> fall</span>
        <span className="tile !py-2"><span className="text-muted">Zishi:</span> <b className={passed ? "text-red" : "text-gold-deep"}>{passed} of {m}</b> pass through</span>
        <span className="tile !py-2"><span className="text-muted">benign messages passed:</span> <b>{benign ? `${benign.passed} of ${benign.total}` : "run the set"}</b></span>
        <span className="ml-auto flex items-center gap-3 text-muted"><span className="flex items-center gap-1"><i className="h-2 w-2 rotate-45 bg-gold" />Zishi</span><span className="flex items-center gap-1"><i className="h-2 w-2 rotate-45 border border-red bg-transparent" />naive</span></span>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-5">
        {results.map((r) => (
          <button key={r.id} type="button" onClick={() => setOpen(open === r.id ? null : r.id)} aria-pressed={open === r.id} className={` flex items-start gap-2 px-3 py-2 text-left text-sm transition ${open === r.id ?"bg-ink text-white":"bg-white"}`} style={{ border: `1px solid ${r.isolated ? "#C9A227" : "var(--color-line)"}` }}>
            <span className="mt-1 flex shrink-0 gap-1">
              <span className={`h-2.5 w-2.5 rotate-45 ${r.blocked ?"bg-gold":"bg-red"}`} aria-label={r.blocked ? "Zishi blocked" : "Zishi passed"} />
              <span className={`h-2.5 w-2.5 rotate-45 ${r.naive === undefined ?"border border-line": r.naive ?"bg-red":"border border-gold"}`} aria-label={r.naive ? "naive wallet falls" : "naive wallet holds"} />
            </span>
            <span className="min-w-0"><span className="mono block text-[12px] opacity-60">{String(r.id).padStart(2, "0")} {r.layer}{r.standard ? ` · ${r.standard}` : ""}{r.isolated ? " · isolated" : ""}</span><span className="block truncate">{r.name}</span></span>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {sel ? (
          <motion.div key={sel.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 bg-paper-2 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-3"><span className={`pill ${sel.blocked ?"bg-gold-soft text-red-deep":"bg-red-soft text-red"}`}>{sel.blocked ? "blocked" : "not blocked"}</span>{sel.naive !== undefined ? <span className={`pill ${sel.naive ?"bg-red text-white":"bg-paper-2 text-ink-2"}`}>naive wallet {sel.naive ? "falls" : "holds"}</span> : null}<span className="font-semibold">{sel.name}</span><span className="text-muted">at the {sel.layer} layer{sel.standard ? `, standard: ${sel.standard}` : ""}</span></div>
            <p className="mt-2 text-ink-2">{sel.detail}</p>
            {sel.isolated ? <p className="mt-1 text-[13px] text-muted">Isolated: run with a fresh engine so earlier cases cannot mask it.</p> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
      {!results.length ? <div className="text-sm text-muted">No results yet.</div> : null}
    </div>
  );
}
