import Link from "next/link";
import Image from "next/image";
import { Seal } from "@/components/Seal";
import { Ticker } from "@/components/Ticker";
import { JudgeConsole } from "@/components/JudgeConsole";
import * as attacksMod from "@/engine/attacks";

const pillars = [["Finishes the job", "No human on the happy path. One labelled arbiter on a flagged task."], ["Holds under attack", "Every attack case blocked, both error rates shown."], ["Pays for its own mistakes", "The vendor bond, not the pilot, covers what the AI gets wrong."], ["Honest on chain", "Three contracts, mirrored in the engine. Base Sepolia when a key is funded, labelled sim otherwise."]];

export default function Home() {
  const attackN = attacksMod.ATTACKS.length;
  return (
    <div className="mx-auto max-w-[1500px]">
      <section className="duotone cut flex min-h-[88svh] items-end text-white">
        <Image src="/photos/shenzhen-tower.jpg" alt="China Resources Tower over Shenzhen Bay at night" fill priority sizes="100vw" className="object-cover object-[50%_35%]" />
        <div className="over pointer-events-none absolute -right-24 top-24 hidden opacity-20 lg:block" style={{ transform: "rotate(-8deg)" }}><Seal size={520} /></div>
        <div className="over mx-auto w-full max-w-[1440px] px-4 pb-14 pt-28 md:px-8 md:pb-20">
          <div className="flex items-center gap-5">
            <Seal size={96} />
            <div>
              <div lang="zh-Hans" className="cjk-serif text-[40px] leading-none">自食其力</div>
              <div className="mt-2 text-[15px] text-white/85">The robot that pays for itself</div>
            </div>
          </div>
          <h1 className="display mt-8 max-w-[15ch] text-[46px] font-extrabold text-white md:text-[80px]">Machines that earn, pay and post a bond.</h1>
          <span className="rule-gold mt-6" />
          <p className="mt-5 max-w-[46ch] text-lg text-white/90 md:text-xl">Paid per verified unit of work. Slashed on proof. Owned once the lease is paid.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/app/fleet" className="btn btn-red" style={{ boxShadow: "inset 0 0 0 1px rgba(201,162,39,0.8)" }}>Watch a drone pay off its lease</Link>
            <Link href="/app/evidence" className="btn" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)" }}>Verify it yourself</Link>
          </div>
        </div>
        <a href="https://commons.wikimedia.org/wiki/File:China_Resources_Tower_View_from_Shenzhen_Bay_20210825.jpg" target="_blank" rel="noreferrer" className="over absolute bottom-3 right-4 text-[12px] text-white/70 hover:text-white">Photo: 歪歪, CC BY-SA 4.0, via Wikimedia Commons</a>
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
