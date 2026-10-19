"use client";
import { motion } from "framer-motion";

export type RuleGroup = { title: string; note: string; rules: [string, string, string?][] };

// Fourteen rules in four groups. Each row carries the live value as a chip. Rows rise in as the board scrolls into view.
export function RulesBoard({ groups }: { groups: RuleGroup[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {groups.map((g, gi) => (
        <motion.section key={g.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.45, delay: gi * 0.08 }} className="card overflow-hidden">
          <div className="flex items-baseline justify-between gap-3 border-b border-rule px-5 py-3" style={{ background: "linear-gradient(90deg, rgba(201,162,39,0.14), transparent 70%)" }}>
            <h3 className="text-[17px] font-bold">{g.title}</h3>
            <span className="label">{g.note}</span>
          </div>
          <ul>
            {g.rules.map(([name, what, value], i) => (
              <motion.li key={name} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: gi * 0.08 + i * 0.06 }} className="group flex items-start gap-3 border-b border-rule px-5 py-3 last:border-b-0 hover:bg-[rgba(201,162,39,0.06)]">
                <span className="mt-[7px] h-2 w-2 shrink-0 rotate-45 bg-gold transition-transform group-hover:scale-125" aria-hidden />
                <span className="min-w-0 flex-1"><span className="font-semibold">{name}</span><span className="block text-[15px] text-ink-2">{what}</span></span>
                {value ? <span className="mono shrink-0 rounded-sm bg-paper-2 px-2 py-1 text-[12px] text-gold-text">{value}</span> : null}
              </motion.li>
            ))}
          </ul>
        </motion.section>
      ))}
    </div>
  );
}
