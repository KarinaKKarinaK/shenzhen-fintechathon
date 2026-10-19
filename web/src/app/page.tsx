import { LandingView } from "@/components/LandingView";
import * as attacksMod from "@/engine/attacks";
import { DEFAULT_POLICY } from "@/engine/policy";

// The numbers come from the engine on the server; the copy is chosen on the client by language.
export default function Home() {
  const attackN = attacksMod.ATTACKS.length;
  const benignN = (attacksMod as unknown as { BENIGN?: unknown[] }).BENIGN?.length ?? 7;
  const p = DEFAULT_POLICY;
  const limits = { payees: Object.keys(p.allowlist).length, perTxCap: p.perTxCap, dailyCap: p.dailyCap, maxPerHour: p.maxPerHour, deviationPct: p.deviationPct, bandLo: p.rateBand[0] * 100, bandHi: p.rateBand[1] * 100, floor: 200 };
  return <LandingView attackN={attackN} benignN={benignN} limits={limits} />;
}
