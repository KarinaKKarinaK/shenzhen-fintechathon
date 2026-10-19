import Link from "next/link";
import { Hero3D } from "@/components/Hero3D";
import { Seal } from "@/components/Logo";
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
    <div className="mx-auto max-w-[1280px]">
      <header className="flex flex-wrap items-center justify-between gap-3 py-2">
        <span className="text-lg font-bold">Zishi <span lang="zh-Hans" className="cjk-serif">自食</span></span>
        <span className="label">Shenzhen FinTechathon 2026, Topic F</span>
      </header>

      <section className="grid grid-cols-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-16">
        <div>
          <div className="flex items-center gap-5">
            <Seal size={96} />
            <div>
              <div lang="zh-Hans" className="cjk-serif text-[34px] leading-none text-ink">自食其力</div>
              <div className="mt-2 text-[15px] text-ink-2">The robot that pays for itself</div>
            </div>
          </div>
          <h1 className="display mt-10 max-w-[16ch] text-[40px] md:text-[49px]">Machines that earn, pay and post a bond.</h1>
          <p className="measure mt-4 text-lg text-ink-2">Paid per verified unit of work. Slashed on proof. Owned once the lease is paid.</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/app/fleet" className="btn btn-red">Watch a drone pay off its lease</Link>
            <Link href="/app/evidence" className="link">Verify it yourself</Link>
          </div>
        </div>
        <div className="card relative h-[340px] overflow-hidden md:h-[460px]">
          <div className="absolute inset-0"><Hero3D /></div>
        </div>
      </section>

      <Ticker />

      <section className="grid grid-cols-1 gap-6 border-b border-rule py-12 md:grid-cols-[auto_1fr] md:items-center">
        <Seal size={72} />
        <div>
          <h2 className="text-[25px]">Zishi, the robot that pays for itself</h2>
          <p className="measure mt-1 text-ink-2">The machine&apos;s own money at risk, so a lender can trust it with a loan.</p>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 md:grid-cols-4">
        {[["20", "attack cases blocked, as proof"], ["3", "contracts"], ["0", "human decisions per task"], ["2", "sides, one rail"]].map(([v, l]) => (
          <div key={l} className="border-l-2 border-gold pl-4"><dt className="sr-only">{l}</dt><dd className="kpi kpi-lg">{v}</dd><dd className="mt-1 text-[15px] text-ink-2">{l}</dd></div>
        ))}
      </dl>

      <section className="py-10">
        <h2 className="text-[31px]">Drones first. Where else it applies</h2>
        <Fan items={uses} />
      </section>

      <section className="grid grid-cols-1 gap-6 py-10 lg:grid-cols-[1.25fr_1fr]">
        <div className="card p-6">
          <h2 className="text-[25px]">Safe by design</h2>
          <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            {strengths.map(([t, b]) => <li key={t}><div className="font-semibold">{t}</div><div className="text-[15px] text-ink-2">{b}</div></li>)}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="text-[25px]">Why it holds up</h2>
          <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            {pillars.map(([n, h]) => <li key={n}><div className="font-semibold">{n}</div><div className="text-[15px] text-ink-2">{h}</div></li>)}
          </ul>
        </div>
      </section>

      <section className="card mt-2 p-6 md:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-[25px]">Only here</h2><span className="label">Six things nobody else built</span></div>
        <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-3">
          {firsts.map((f) => <li key={f} className="flex gap-3"><span className="mt-[0.6em] h-px w-4 shrink-0 bg-gold" aria-hidden />{f}</li>)}
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/app" className="btn btn-ink">Open mission control</Link>
          <a href="https://github.com/KarinaKKarinaK/shenzhen-fintechathon" target="_blank" rel="noreferrer" className="link">Design and research</a>
        </div>
      </section>

      <footer className="flex flex-wrap items-center gap-3 py-10 text-[15px] text-ink-2">
        <span lang="zh-Hans" className="cjk-serif text-ink">自食其力</span>
        <span>zì shí qí lì, to feed yourself by your own labour.</span>
      </footer>
    </div>
  );
}
