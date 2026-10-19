"use client";
import { useState } from "react";
import { motion } from "framer-motion";

// Fanned cards on black. Click a card to bring it to the front.
export function Fan({ items }: { items: { who: string; line: string; tag: string }[] }) {
  const [active, setActive] = useState(2);
  const n = items.length;
  return (
    <div className="relative mx-auto h-[360px] w-full max-w-[960px]">
      {items.map((it, i) => {
        const off = i - active;
        const rot = off * 9, x = off * 150, y = Math.abs(off) * 26, z = n - Math.abs(off);
        const front = off === 0;
        return (
          <motion.button key={it.who} type="button" onClick={() => setActive(i)} animate={{ x, y, rotate: rot, scale: front ? 1 : 0.92, opacity: Math.abs(off) > 2 ? 0.35 : 1 }} transition={{ type: "spring", stiffness: 160, damping: 22 }} style={{ zIndex: z, left: "50%", marginLeft: -120 }} className={`absolute top-6 h-[300px] w-[240px] overflow-hidden text-left ${front ? "grain" : "grain grain-black"}`} aria-pressed={front}>
            <div className={`flex h-full flex-col justify-between p-5 ${front ? "text-ink" : "text-white"}`}>
              <div className="flex items-center justify-between"><span className="pill bg-red text-white">{it.tag}</span><span className="tech text-[10px] tracking-[0.2em] opacity-70">{String(i + 1).padStart(2, "0")}</span></div>
              <div><div className="tech text-lg font-bold uppercase leading-tight">{it.who}</div><p className={`mt-2 text-sm ${front ? "text-ink-2" : "text-white/80"}`}>{it.line}</p></div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
