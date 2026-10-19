"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Seven steps on one track. A gold pulse walks the track and lights each step in turn.
export function FlowTimeline({ steps }: { steps: [string, string][] }) {
  const [on, setOn] = useState(0);
  useEffect(() => { const id = setInterval(() => setOn((i) => (i + 1) % steps.length), 1700); return () => clearInterval(id); }, [steps.length]);
  const pct = (on / (steps.length - 1)) * 100;
  return (
    <div className="relative mt-8">
      <div className="absolute left-[7%] right-[7%] top-[22px] hidden h-px bg-rule md:block" aria-hidden />
      <motion.div className="absolute left-[7%] top-[22px] hidden h-px bg-gold md:block" style={{ originX: 0 }} animate={{ width: `${pct * 0.86}%` }} transition={{ type: "spring", stiffness: 60, damping: 18 }} aria-hidden />
      <ol className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-7">
        {steps.map(([t, b], i) => {
          const active = i === on, done = i < on;
          return (
            <li key={t} className="group relative" onMouseEnter={() => setOn(i)}>
              <motion.span className="relative z-10 grid h-11 w-11 place-items-center rounded-full border-2 bg-paper font-mono text-sm font-semibold" animate={{ borderColor: active ? "#c9a227" : done ? "#8a6a1f" : "#e4e1d8", backgroundColor: active ? "#c9a227" : "#faf9f6", color: active ? "#1f1a17" : done ? "#8a6a1f" : "#5c524a", scale: active ? 1.12 : 1 }} transition={{ duration: 0.3 }}>{i + 1}</motion.span>
              {active ? <span className="pulse absolute left-0 top-0 h-11 w-11 rounded-full" aria-hidden /> : null}
              <div className={`mt-4 text-lg font-semibold transition-colors ${active ? "text-ink" : "text-ink-2"}`}>{t}</div>
              <div className="mt-1 text-[15px] text-ink-2">{b}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
