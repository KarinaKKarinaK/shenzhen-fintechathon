"use client";
import { motion } from "framer-motion";
import { CountUp } from "./CountUp";

const icons: Record<string, React.ReactNode> = {
  key: <path d="M14 7a4 4 0 1 1-2.6 7.1L9 16.5V19H6.5v2.5H3v-3.5l6.1-6.1A4 4 0 0 1 14 7z" />,
  gate: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M12 5v14M4 12h8" /></>,
  calc: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h3M13 11h3M8 15h3M13 15h3" /></>,
  pen: <path d="M4 20l4-1 10-10-3-3L5 16zM14 6l3 3" />,
  scale: <><path d="M12 4v16M5 8h14M6 8l-3 6h6zM18 8l-3 6h6z" /><path d="M8 20h8" /></>,
  chain: <><path d="M9 15a4 4 0 0 1 0-6l2-2a4 4 0 0 1 6 6l-1 1" /><path d="M15 9a4 4 0 0 1 0 6l-2 2a4 4 0 0 1-6-6l1-1" /></>,
  learn: <><path d="M4 18l5-6 4 3 7-9" /><path d="M4 21h16" /><circle cx="9" cy="12" r="1.2" /><circle cx="13" cy="15" r="1.2" /></>,
};

export function SafeByDesign({ items }: { items: [string, string, string][] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([t, b, ic], i) => (
        <motion.li key={t} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.4, delay: i * 0.07 }} className="flex gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink" style={{ background: "linear-gradient(160deg, #fff7dd, #ecd79a)", boxShadow: "inset 0 0 0 1px rgba(201,162,39,0.6)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{icons[ic]}</svg>
          </span>
          <span><span className="block font-semibold">{t}</span><span className="block text-[15px] text-ink-2">{b}</span></span>
        </motion.li>
      ))}
    </ul>
  );
}

export function HoldsUp({ items }: { items: { n: number; suffix?: string; title: string; line: string }[] }) {
  return (
    <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule lg:grid-cols-4">
      {items.map((it, i) => (
        <motion.li key={it.title} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }} className="bg-surface p-5">
          <div className="kpi kpi-lg text-gold-text"><CountUp value={it.n} decimals={0} />{it.suffix ?? ""}</div>
          <div className="mt-2 font-semibold">{it.title}</div>
          <div className="mt-1 text-[15px] text-ink-2">{it.line}</div>
        </motion.li>
      ))}
    </ul>
  );
}

export function OnlyHere({ items }: { items: string[] }) {
  return (
    <ol className="grid grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2">
      {items.map((f, i) => (
        <motion.li key={f} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.07 }} className="flex items-baseline gap-4 border-b border-white/15 pb-4">
          <span className="font-mono text-2xl font-semibold text-gold">{String(i + 1).padStart(2, "0")}</span>
          <span className="text-lg">{f}</span>
        </motion.li>
      ))}
    </ol>
  );
}
