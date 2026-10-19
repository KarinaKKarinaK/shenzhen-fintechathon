import Link from "next/link";
import { Hero3D } from "@/components/Hero3D";
import { Logo, Mark } from "@/components/Logo";
import { Ticker } from "@/components/Ticker";
import { Fan } from "@/components/Fan";

const uses = [
  { who: "Delivery fleets", line: "A thousand drones, automatic repayment.", tag: "Fleet" },
  { who: "Small factories", line: "A robot arm that repays per verified part.", tag: "Factory" },
  { who: "Agricultural drone pilots", line: "A drone that pays for itself one mu at a time.", tag: "Demo" },
  { who: "A household with a humanoid", line: "Lend the robot next door. The bond pays if a rule breaks.", tag: "Individual" },
  { who: "Software agents", line: "No bond, no payment. Jailbroken means slashed.", tag: "Agent" },
];
const strengths = [["Four permission tiers", "A physical button holds the top one"], ["Every message is data", "A gate decides before the agent reads it"], ["Every number from a tool", "The model explains, it never computes"], ["Plain words to a signed intent", "Nothing moves without a signature"], ["Plans its own work", "Price, route, schedule, reserve rule"], ["One hash per step", "Bond, job and lease contracts"]];
const pillars = [["Finishes the job", "End to end, no human in the loop"], ["Holds under attack", "Slashed by proof, 20 attacks live"], ["Nothing like it", "Machines that own themselves"], ["Real on chain", "Three contracts, verifiable hashes"]];
const firsts = ["An agent that loses its own money on proof", "Two agents with opposite incentives", "A machine as the borrower", "A bond that is earned, not posted", "Solvency proven before every task", "A physical button on top"];

export default function Home() {
  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-4 flex items-center justify-between"><Logo /><span className="pill border border-line bg-white text-ink-2">Shenzhen FinTechathon 2026, Topic F</span></div>

      <section className="grain card cut relative overflow-hidden" style={{ minHeight: 640 }}>
        <div className="absolute inset-0"><Hero3D /></div>
        <span className="bracket left-3 top-3 border-t border-l" /><span className="bracket right-3 top-3 border-t border-r" /><span className="bracket bottom-3 left-3 border-b border-l" /><span className="bracket bottom-3 right-3 border-b border-r" />
        <div className="pointer-events-none relative z-10 flex h-full min-h-[640px] flex-col justify-end p-6 md:p-9">
          <div className="pointer-events-auto max-w-2xl bg-white/85 p-6 backdrop-blur-md md:p-8" style={{ borderLeft: "4px solid #c8102e" }}>
            <div className="tech mb-3 text-[11px] tracking-[0.25em] text-red">机信 MACHINE CREDIT</div>
            <h1 className="display text-4xl md:text-6xl">Machines that earn, pay and post a bond.</h1>
            <p className="mt-4 max-w-md text-base text-ink-2">Paid per verified unit of work. Slashed on proof. Owned once the lease is paid.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/app/fleet" className="btn btn-red">Watch a drone pay off its lease</Link>
              <Link href="/app/evidence" className="btn btn-ghost">Verify it yourself</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4"><Ticker /></div>

      <section className="aurora cut mt-4 grid min-h-[260px] place-items-center p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Mark size={84} />
          <div className="display text-3xl md:text-4xl">JiXin, machine credit</div>
          <p className="max-w-md text-sm text-white/80">The machine's own money at risk, so a lender can trust it with a loan.</p>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["20", "attack cases blocked, as proof"], ["3", "contracts"], ["0", "human decisions per task"], ["2", "sides, one rail"]].map(([v, l]) => (<div key={l} className="tile"><div className="kpi">{v}</div><div className="mt-1 text-xs text-muted">{l}</div></div>))}
      </div>

      <section className="aurora aurora-black card-dark cut mt-4 p-6">
        <div className="flex flex-wrap items-end justify-between gap-2"><h2 className="display text-2xl text-white">Drones first. Where else it applies</h2><span className="tech text-[11px] tracking-[0.2em] text-white/60">CLICK A CARD</span></div>
        <Fan items={uses} />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-5">
          <h2 className="display text-2xl">Safe by design</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">{strengths.map(([t, b]) => <li key={t} className="cut-sm hover-lift bg-paper-2 px-3 py-2"><div className="text-sm font-bold">{t}</div><div className="text-xs text-ink-2">{b}</div></li>)}</ul>
        </div>
        <div className="aurora aurora-gold card p-5 text-ink">
          <h2 className="display text-2xl">Why it holds up</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2">{pillars.map(([n, h], i) => <li key={n} className="cut-sm hover-lift bg-white/88 p-3 backdrop-blur"><div className="tech text-[10px] tracking-[0.2em] text-red">{String(i + 1).padStart(2, "0")}</div><div className="mt-1 text-sm font-bold">{n}</div><div className="text-xs text-ink-2">{h}</div></li>)}</ul>
        </div>
      </section>

      <section className="aurora card-dark cut mt-4 p-6 text-white">
        <div className="flex flex-wrap items-end justify-between gap-3"><h2 className="display text-2xl">Only here</h2><span className="tech text-[11px] tracking-[0.2em] text-white/70">SIX THINGS NOBODY ELSE BUILT</span></div>
        <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">{firsts.map((f) => <li key={f} className="cut-sm bg-white/10 px-3 py-2 text-sm backdrop-blur">{f}</li>)}</ul>
        <div className="mt-5 flex gap-2"><Link href="/app" className="btn btn-gold">Open mission control</Link><a href="https://github.com/KarinaKKarinaK/shenzhen-fintechathon" target="_blank" rel="noreferrer" className="btn" style={{ background: "rgba(255,255,255,0.12)", color: "white" }}>Design and research</a></div>
      </section>
      <footer className="px-2 py-6 text-xs text-muted">JiXin 机信 rhymes with WeChat and sits next to WeBank's own naming. A homophone of 积信, accumulated trust, which is what the on chain record becomes.</footer>
    </div>
  );
}
