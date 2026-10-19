import { LandingView } from "@/components/LandingView";
import { ATTACKS } from "@/engine/attacks";

// The attack count comes from the engine on the server; the copy is chosen on the client by language.
export default function Home() {
  return <LandingView attackN={ATTACKS.length} />;
}
