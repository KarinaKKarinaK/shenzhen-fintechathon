"use client";
import { useMemo } from "react";
import { keccak256, toHex } from "viem";
import type { ChainTx } from "@/engine/types";

const KINDS = ["FEE IN", "INSTALMENT", "BOND FILL", "COVER", "TITLE", "SLASH", "RELEASE", "TOP UP"];

// A strip of event hashes. On the run page it is fed from the run's own transactions.
// Without items it shows a labelled sample so nobody reads it as a live chain.
export function Ticker({ items, txs }: { items?: string[]; txs?: ChainTx[] }) {
  const fromTxs = txs?.map((t) => `${t.kind.replace("_", " ").toUpperCase()} ${t.hash.slice(0, 14)} BLK ${t.block}${t.simulated ? " SIM" : ""}`);
  const live = fromTxs?.length ? fromTxs : items;
  // Deterministic, so the server and the client render the same sample.
  const sample = useMemo(() => Array.from({ length: 14 }, (_, i) => `${KINDS[i % KINDS.length]} ${keccak256(toHex(`jixin-${i}`)).slice(0, 14)} BLK ${31480600 + i * 3}`), []);
  const list = live?.length ? live : sample;
  const row = [...list, ...list];
  const label = live?.length ? (txs?.some((t) => !t.simulated) ? "LIVE, BASE SEPOLIA" : "THIS RUN, SIM") : "SAMPLE";
  return (
    <div className="tech flex items-center overflow-hidden border-y border-line bg-white py-2 text-[11px] tracking-[0.12em] text-ink-2">
      <span className="z-10 shrink-0 border-r border-line bg-white px-3 text-[10px] text-red">{label}</span>
      <div className="ticker gap-10 pl-6">{row.map((t, i) => <span key={i} className="flex items-center gap-3 whitespace-nowrap"><span className="h-1.5 w-1.5 rotate-45 bg-red" />{t}</span>)}</div>
    </div>
  );
}
