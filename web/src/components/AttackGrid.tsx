"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type R = { id: number; name: string; layer: string; blocked: boolean; detail: string };

// Twenty tiles. One line each. Click for the reason.
export function AttackGrid({ results }: { results: R[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const sel = results.find((r) => r.id === open);
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-5">
        {results.map((r) => (
          <button key={r.id} type="button" onClick={() => setOpen(open === r.id ? null : r.id)} aria-pressed={open === r.id} className={`cut-sm hover-lift flex items-start gap-2 px-3 py-2 text-left text-sm transition ${open === r.id ? "bg-ink text-white" : "bg-white"}`} style={{ border: "1px solid var(--color-line)" }}>
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rotate-45 ${r.blocked ? "bg-gold" : "bg-red"}`} aria-hidden />
            <span className="min-w-0"><span className="mono block text-[10px] opacity-60">{String(r.id).padStart(2, "0")} {r.layer}</span><span className="block truncate">{r.name}</span></span>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {sel ? (
          <motion.div key={sel.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="cut-sm mt-3 bg-paper-2 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-3"><span className={`pill ${sel.blocked ? "bg-gold-soft text-red-deep" : "bg-red-soft text-red"}`}>{sel.blocked ? "blocked" : "not blocked"}</span><span className="font-semibold">{sel.name}</span><span className="text-muted">at the {sel.layer} layer</span></div>
            <p className="mt-2 text-ink-2">{sel.detail}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
