"use client";
import { useEffect, useRef, useState } from "react";

export function CountUp({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now(), a = from.current, b = value;
    if (a === b) return;
    let raf = 0;
    const tick = (t: number) => { const k = Math.min(1, (t - start) / 500); const e = 1 - Math.pow(1 - k, 3); setShown(a + (b - a) * e); if (k < 1) raf = requestAnimationFrame(tick); else from.current = b; };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown.toFixed(decimals)}</>;
}
