"use client";
import { useMemo } from "react";
import { keccak256, toHex } from "viem";
import type { ChainTx } from "@/engine/types";

const KINDS = ["Fee in", "Instalment", "Bond fill", "Cover", "Title", "Slash", "Release", "Top up"];

// A strip of event hashes. On the run page it is fed from the run's own transactions.
// Without items it shows a labelled sample so nobody reads it as a live chain. Static, no scrolling.
export function Ticker({ items, txs }: { items?: string[]; txs?: ChainTx[] }) {
  const fromTxs = txs?.map((t) => `${t.kind.replace("_", " ")} ${t.hash.slice(0, 14)} blk ${t.block}${t.simulated ? " sim" : ""}`);
  const live = fromTxs?.length ? fromTxs : items;
  // Deterministic, so the server and the client render the same sample.
  const sample = useMemo(() => Array.from({ length: 14 }, (_, i) => `${KINDS[i % KINDS.length]} ${keccak256(toHex(`jixin-${i}`)).slice(0, 14)} blk ${31480600 + i * 3}`), []);
  const list = live?.length ? live : sample;
  const label = live?.length ? (txs?.some((t) => !t.simulated) ? "Live, Base Sepolia" : "This run, simulated") : "Sample";
  return (
    <div className="flex h-9 items-center overflow-hidden border-y border-rule">
      <span className="shrink-0 border-r border-rule pr-3 text-[13px] font-semibold text-seal">{label}</span>
      <div className="ticker gap-x-8 pl-4 py-2 text-[13px] text-ink-2">{list.map((t, i) => {
        const at = t.indexOf("0x");
        const kind = at > 0 ? t.slice(0, at).trim() : t, rest = at > 0 ? t.slice(at) : "";
        return <span key={i} className="whitespace-nowrap"><span className="capitalize text-ink">{kind}</span> <span className="mono">{rest}</span></span>;
      })}</div>
    </div>
  );
}
