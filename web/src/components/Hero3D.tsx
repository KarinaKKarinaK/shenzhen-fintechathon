"use client";
import Scene from "./SceneLoader";
import { useEffect, useState } from "react";
import type { ChainTx, MachineState } from "@/engine/types";

// Idle demo world for the landing: a drone circling the field with money moving on a slow loop. No backend.
export function Hero3D() {
  const [m, setM] = useState<MachineState>({ id: "hero", name: "Agras unit A7", kind: "drone", balance: 2015, reserve: 200, bond: 524, bondMin: 2000, startFloor: 200, vendorBond: 5000, currency: "CNY", leaseBalance: 650, leaseTotal: 55000, muDone: 13600, muTotal: 13750, owned: false, slashes: 0, tasksDone: 2, position: { x: -3, y: 1.8, z: -1 }, heading: 0, status: "moving" });
  const [txs, setTxs] = useState<ChainTx[]>([]);
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1; const t = i / 16;
      setM((s) => ({ ...s, position: { x: Math.cos(t) * 4.2, y: 1.8 + Math.sin(t * 2) * 0.3, z: Math.sin(t) * 2.4 }, heading: -t + Math.PI / 2 }));
      if (i % 30 === 0) {
        const kinds: ChainTx["kind"][] = ["fee_in", "instalment", "bond_fill"];
        const kind = kinds[(i / 30) % kinds.length];
        const now = Date.now();
        const tx: ChainTx = { hash: `0xhero${i}`, label: kind, kind, amount: 1, currency: "CNY", from: "a", to: "b", block: i, simulated: true, status: "finalised", sentAt: now, confirmedAt: now, finalisedAt: now };
        setTxs((x) => [tx, ...x].slice(0, 6));
      }
    }, 100);
    return () => clearInterval(id);
  }, []);
  return <Scene side="fleet" machine={m} txs={txs} jobs={{}} autoRotate live={false} labels={false} />;
}
