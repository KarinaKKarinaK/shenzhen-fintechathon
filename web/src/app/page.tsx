import Link from "next/link";
import { Hero3D } from "@/components/Hero3D";
import { Logo } from "@/components/Logo";
import { Ticker } from "@/components/Ticker";
import { Fan } from "@/components/Fan";

const uses = [
  { who: "Delivery fleets", line: "A thousand drones with automatic repayment and a compliance proof per machine.", tag: "Fleet" },
  { who: "Small factories", line: "A robot arm that repays its lease per verified part. Frozen on tampered data.", tag: "Factory" },
  { who: "Agricultural drone pilots", line: "A drone that pays for itself one mu at a time. 200,000 pilots with nothing to pledge but the machine.", tag: "Demo" },
  { who: "A household with a humanoid", line: "Lend the robot to the neighbour. The fee locks, the fence holds, the bond pays if a rule breaks.", tag: "Individual" },
  { who: "Software agents", line: "An agent must post a bond before it may pay. Jailbroken means slashed.", tag: "Agent" },
];
const requirements = ["Permission hierarchy: four tiers, a physical button on top", "Injection defense: every message is data, a judge gate, payees never from text", "Hallucination prevention: every number from a tool", "Intent understanding: plain language to a signed typed intent", "Task planning: price, route, schedule, reserve rule", "On-chain execution: bond, job and lease contracts, one hash per step"];
const scoring = [["40", "Task completion", "Paid work end to end, no human, one hash per step"], ["30", "Security", "Bond slashed by proof, gate, policy engine, 20 attacks live"], ["30", "Innovation", "Machines that earn, pay and own themselves"], ["+5", "On-chain", "Three contracts on a public testnet"]];
const firsts = ["An agent that loses its own money on proof of a violation", "Two agents with opposite incentives transacting", "A machine as the borrower, title transfer on chain", "The bond is earned, not posted", "Proof of solvency read from chain before every task", "A physical button as the top permission tier"];

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
            <p className="mt-4 max-w-md text-base text-ink-2">A wallet standard for drones, humanoids and agents. Paid per verified unit of work, slashed on proof, owned once the lease is paid.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/app/fleet" className="btn btn-red">Watch a drone pay off its lease</Link>
              <Link href="/app/evidence" className="btn btn-ghost">Verify it yourself</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4"><Ticker /></div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["20", "attack cases blocked, as proof"], ["3", "contracts"], ["0", "human decisions per task"], ["2", "sides, one rail"]].map(([v, l]) => (<div key={l} className="tile"><div className="kpi">{v}</div><div className="mt-1 text-xs text-muted">{l}</div></div>))}
      </div>

      <section className="grain grain-black card-dark cut mt-4 p-6">
        <div className="flex flex-wrap items-end justify-between gap-2"><h2 className="display text-2xl text-white">Drones first. Where else it applies</h2><span className="tech text-[11px] tracking-[0.2em] text-white/60">CLICK A CARD</span></div>
        <Fan items={uses} />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-5">
          <h2 className="display text-2xl">What the competition requires</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">{requirements.map((r) => <li key={r} className="cut-sm bg-paper-2 px-3 py-2 text-sm text-ink-2">{r}</li>)}</ul>
        </div>
        <div className="grain grain-gold card p-5">
          <h2 className="display text-2xl">How it scores</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2">{scoring.map(([w, n, h]) => <li key={n} className="cut-sm bg-white/85 p-3 backdrop-blur"><div className="kpi text-red">{w}</div><div className="mt-1 text-sm font-bold">{n}</div><div className="text-xs text-ink-2">{h}</div></li>)}</ul>
        </div>
      </section>

      <section className="grain grain-red card-dark cut mt-4 p-6 text-white">
        <div className="flex flex-wrap items-end justify-between gap-3"><h2 className="display text-2xl">What no other entry has</h2><span className="tech text-[11px] tracking-[0.2em] text-white/70">ABOUT 150 PUBLIC ENTRIES READ</span></div>
        <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">{firsts.map((f) => <li key={f} className="cut-sm bg-white/10 px-3 py-2 text-sm backdrop-blur">{f}</li>)}</ul>
        <div className="mt-5 flex gap-2"><Link href="/app" className="btn btn-gold">Open mission control</Link><a href="https://github.com/KarinaKKarinaK/shenzhen-fintechathon" target="_blank" rel="noreferrer" className="btn" style={{ background: "rgba(255,255,255,0.12)", color: "white" }}>Design and research</a></div>
      </section>
      <footer className="px-2 py-6 text-xs text-muted">JiXin 机信 rhymes with WeChat and sits next to WeBank's own naming. A homophone of 积信, accumulated trust, which is what the on chain record becomes.</footer>
    </div>
  );
}
