"use client";
import { useEffect, useState } from "react";
import { keccak256, toHex } from "viem";

// A strip of event hashes. Purely decorative on the landing, real on the run page. Static, no scrolling.
export function Ticker({ items }: { items?: string[] }) {
  const [list, setList] = useState<string[]>(items ?? []);
  useEffect(() => {
    if (items) { setList(items); return; }
    const kinds = ["Fee in", "Instalment", "Bond fill", "Cover", "Title", "Slash", "Release", "Top up"];
    setList(Array.from({ length: 14 }, (_, i) => `${kinds[i % kinds.length]} ${keccak256(toHex(`jixin-${i}`)).slice(0, 14)} blk ${31480600 + i * 3}`));
  }, [items]);
  return (
    <div className="h-9 overflow-hidden border-y border-rule">
      <div className="ticker gap-x-8 py-2 text-[13px] text-ink-2">{list.map((t, i) => {
        const at = t.indexOf("0x");
        const kind = at > 0 ? t.slice(0, at).trim() : t, rest = at > 0 ? t.slice(at) : "";
        return <span key={i} className="whitespace-nowrap"><span className="text-ink">{kind}</span> <span className="mono">{rest}</span></span>;
      })}</div>
    </div>
  );
}
