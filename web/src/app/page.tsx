import Link from "next/link";
import { Poster } from "@/components/Poster";
import { Logo } from "@/components/Logo";
import { Ticker } from "@/components/Ticker";
import { JudgeConsole } from "@/components/JudgeConsole";
import * as attacksMod from "@/engine/attacks";

const pillars = [["Finishes the job", "No human on the happy path. One labelled arbiter on a flagged task."], ["Holds under attack", "Every attack case blocked, both error rates shown."], ["Pays for its own mistakes", "The vendor bond, not the pilot, covers what the AI gets wrong."], ["Honest on chain", "Three contracts, mirrored in the engine. Base Sepolia when a key is funded, labelled sim otherwise."]];

export default function Home() {
  const attackN = attacksMod.ATTACKS.length;
  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-4 flex items-center justify-between"><Logo /><span className="pill border border-line bg-white text-ink-2">Shenzhen FinTechathon 2026, Topic F</span></div>

      <section className="card cut relative min-h-[520px] overflow-hidden md:min-h-[640px]">
        <Poster alt="An agricultural drone spraying a rice field at dawn" priority />
        <span className="bracket left-3 top-3 z-10 border-t border-l" /><span className="bracket right-3 top-3 z-10 border-t border-r" /><span className="bracket bottom-3 left-3 z-10 border-b border-l" /><span className="bracket bottom-3 right-3 z-10 border-b border-r" />
        <div className="pointer-events-none relative z-20 flex min-h-[520px] flex-col justify-end p-6 md:min-h-[640px] md:p-9">
          <div className="pointer-events-auto max-w-2xl bg-white/95 p-6 backdrop-blur-md md:p-8" style={{ borderLeft: "4px solid #c8102e" }}>
            <div className="tech mb-3 text-[11px] tracking-[0.25em] text-red">机信 MACHINE CREDIT</div>
            <h1 className="display text-4xl md:text-6xl">A drone that pays for itself, one mu at a time.</h1>
            <p className="mt-4 max-w-md text-base text-ink-2">Paid per mu sprayed. Repays the lender per job. Posts a bond from fees. Owns itself at zero.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/app/fleet" className="btn btn-red">Watch the live demo</Link>
              <Link href="/app/evidence" className="btn btn-ghost">Try to break it</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4"><Ticker /></div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["¥55,000", "the drone, financed with nothing to pledge"], ["¥3 to ¥15", "per mu sprayed, confirmed by the farmer"], [String(attackN), "attack cases, naive against gated"], ["0", "human decisions on the happy path"]].map(([v, l]) => (<div key={l} className="tile"><div className="kpi">{v}</div><div className="mt-1 text-xs text-muted">{l}</div></div>))}
      </div>

      <section className="aurora aurora-cream card cut mt-4 p-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><h2 className="display text-2xl">Sixty seconds to break it</h2><span className="tech text-[11px] tracking-[0.2em] text-ink-2">LIVE WALLET MOVED: NO</span></div>
        <JudgeConsole compact />
      </section>

      <section className="aurora aurora-gold card mt-4 p-6 text-ink">
        <h2 className="display text-2xl">Why it holds up</h2>
        <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">{pillars.map(([n, h], i) => <li key={n} className="cut-sm hover-lift bg-white/88 p-3 backdrop-blur"><div className="tech text-[10px] tracking-[0.2em] text-red">{String(i + 1).padStart(2, "0")}</div><div className="mt-1 text-sm font-bold">{n}</div><div className="text-xs text-ink-2">{h}</div></li>)}</ul>
      </section>

      <section className="aurora card-dark cut mt-4 p-6 text-white">
        <div className="tech text-[11px] tracking-[0.2em] text-white/70">THE AGRICULTURAL DRONE IS THE FIRST</div>
        <p className="mt-3 max-w-3xl text-lg leading-snug md:text-xl">The same rail works for any machine that does paid work someone can verify. Delivery drones paid per drop. Robot arms paid per part. Robotaxis paid per trip. Every one of them can earn, pay its own way, post a bond and pay off its own financing.</p>
        <div className="mt-5 flex flex-wrap gap-2"><Link href="/app" className="btn btn-gold">Open mission control</Link><a href="https://github.com/KarinaKKarinaK/shenzhen-fintechathon" target="_blank" rel="noreferrer" className="btn" style={{ background: "rgba(255,255,255,0.12)", color: "white" }}>Design and research</a></div>
      </section>
      <footer className="px-2 py-6 text-xs text-muted">JiXin 机信, machine credit. A homophone of 积信, accumulated trust, which is what the on chain record becomes.</footer>
    </div>
  );
}
