"use client";
import Scene from "./SceneLoader";
import { useEffect, useState } from "react";
import type { ChainTx, MachineState } from "@/engine/types";

export function Hero3D() {
  const [m, setM] = useState<MachineState>({ id: "hero", name: "Agras unit A7", kind: "drone", balance: 0, reserve: 0, bond: 30, bondMin: 30, leaseBalance: 40, leaseTotal: 54, owned: false, slashes: 0, tasksDone: 0, position: { x: -3, y: 1.8, z: -1 }, heading: 0, status: "moving" });
  const [txs, setTxs] = useState<ChainTx[]>([]);
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1; const t = i / 16;
      setM((s) => ({ ...s, position: { x: Math.cos(t) * 4.2, y: 1.8 + Math.sin(t * 2) * 0.3, z: Math.sin(t) * 2.4 }, heading: -t + Math.PI / 2 }));
      if (i % 30 === 0) { const kinds: ChainTx["kind"][] = ["fee_in", "instalment", "bond_fill"]; const kind = kinds[(i / 30) % kinds.length]; setTxs((x) => [{ hash: `0xhero${i}`, label: kind, kind, amount: 1, from: "a", to: "b", block: i, simulated: true }, ...x].slice(0, 6)); }
    }, 100);
    return () => clearInterval(id);
  }, []);
  return <Scene side="fleet" machine={m} txs={txs} jobs={{}} autoRotate live={false} labels={false} />;
}
