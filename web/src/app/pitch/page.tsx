import type { Metadata } from "next";
import { Pitch } from "@/components/Pitch";
import { ATTACKS, BENIGN } from "@/engine/attacks";
import { DEFAULT_POLICY } from "@/engine/policy";

export const metadata: Metadata = { title: "JiXin · Pitch" };

export default function PitchPage() {
  const p = DEFAULT_POLICY;
  return <Pitch attacks={ATTACKS.length} benign={BENIGN.length} perTxCap={p.perTxCap} dailyCap={p.dailyCap} maxPerHour={p.maxPerHour} deviationPct={p.deviationPct} />;
}
