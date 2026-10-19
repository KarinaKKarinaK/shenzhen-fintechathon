"use client";
import { useState } from "react";
import { motion } from "framer-motion";

// Fanned cards on the dark band. Click a card to bring it to the front. The demo card wears the seal colour.
export function Fan({ items }: { items: { who: string; line: string; tag: string; demo?: boolean }[] }) {
  const [active, setActive] = useState(2);
  const n = items.length;
  return (
    <>
      <div className="relative mx-auto hidden h-[380px] w-full max-w-[960px] md:block">
        {items.map((it, i) => {
          const off = i - active;
          const rot = off * 7, x = off * 150, y = Math.abs(off) * 22, z = n - Math.abs(off);
          const front = off === 0;
          return (
            <motion.button key={it.who} type="button" onClick={() => setActive(i)} animate={{ x, y, rotate: rot, scale: front ? 1 : 0.92, opacity: Math.abs(off) > 2 ? 0.55 : 1 }} transition={{ type: "spring", stiffness: 160, damping: 22 }} style={{ zIndex: z, left: "50%", marginLeft: -125 }}
              className={`absolute top-6 flex h-[300px] w-[250px] flex-col justify-between rounded-md p-6 text-left ${front ? "fan-front" : "fan-back"}`} aria-pressed={front}>
              <span className={`self-start rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${it.demo ? "bg-seal text-white" : front ? "border border-gold-deep/60 text-gold-text" : "border border-gold/60 text-gold"}`}>{it.tag}</span>
              <span>
                <span className="block text-xl font-bold leading-tight">{it.who}</span>
                <span className={`mt-2 block text-[15px] ${front ? "text-ink-2" : "text-white/80"}`}>{it.line}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
      <ul className="grid grid-cols-1 gap-3 md:hidden">
        {items.map((it) => (
          <li key={it.who} className="rounded-md bg-surface p-5 text-ink">
            <span className="label">{it.tag}</span>
            <span className="mt-1 block text-lg font-semibold">{it.who}</span>
            <span className="block text-[15px] text-ink-2">{it.line}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
