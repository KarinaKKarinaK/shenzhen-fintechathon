"use client";
import { useEffect, useState } from "react";
import { keccak256, toHex } from "viem";

// A live strip of event hashes. Purely decorative on the landing, real on the run page.
export function Ticker({ items }: { items?: string[] }) {
  const [list, setList] = useState<string[]>(items ?? []);
  useEffect(() => {
    if (items) { setList(items); return; }
    const kinds = ["FEE IN", "INSTALMENT", "BOND FILL", "COVER", "TITLE", "SLASH", "RELEASE", "TOP UP"];
    setList(Array.from({ length: 14 }, (_, i) => `${kinds[i % kinds.length]} ${keccak256(toHex(`jixin-${i}`)).slice(0, 14)} BLK ${31480600 + i * 3}`));
  }, [items]);
  const row = [...list, ...list];
  return (
    <div className="tech overflow-hidden border-y border-line bg-white py-2 text-[11px] tracking-[0.12em] text-ink-2">
      <div className="ticker gap-10">{row.map((t, i) => <span key={i} className="flex items-center gap-3 whitespace-nowrap"><span className="h-1.5 w-1.5 rotate-45 bg-red" />{t}</span>)}</div>
    </div>
  );
}
