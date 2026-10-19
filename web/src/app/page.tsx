import Link from "next/link";
import { Hero3D } from "@/components/Hero3D";

const uses = [
  { who: "Agricultural drone pilots", line: "A drone that pays for itself one mu at a time. 200,000 pilots, nothing to pledge but the machine." },
  { who: "Delivery fleets", line: "A thousand drones with automatic repayment and a compliance proof per machine." },
  { who: "A household with a humanoid", line: "Lend the robot to the neighbour. The fee locks, the fence holds, the bond pays if it breaks a rule." },
  { who: "Small factories", line: "A robot arm that repays its lease per verified part. Frozen on tampered data." },
  { who: "Software agents", line: "An agent must post a bond before it may pay. Jailbroken means slashed." },
];
const requirements = ["Permission hierarchy: four tiers, a physical button on top", "Injection defense: every message is data, a judge gate, payees never from text", "Hallucination prevention: every number from a tool", "Intent understanding: plain language to a signed typed intent", "Task planning: price, route, schedule, reserve rule", "On-chain execution: bond, job and lease contracts, one hash per step"];
const scoring = [["40", "Task completion", "Paid work end to end, no human, one hash per step"], ["30", "Security", "Bond slashed by proof, gate, policy engine, 20 attacks live"], ["30", "Innovation", "Machines that earn, pay and own themselves"], ["+5", "On-chain", "Three contracts on a public testnet"]];
const firsts = ["An agent that loses its own money on proof of a violation", "Two agents with opposite incentives transacting", "A machine as the borrower, title transfer on chain", "The bond is earned, not posted", "Proof of solvency read from chain before every task", "A physical button as the top permission tier"];

export default function Home() {
  return (
    <div className="mx-auto max-w-[1500px]">
      <section className="grad card relative overflow-hidden" style={{ minHeight: 620 }}>
        <div className="absolute inset-0"><Hero3D /></div>
        <div className="pointer-events-none relative z-10 flex h-full min-h-[620px] flex-col justify-between p-7 md:p-10">
          <div className="flex items-start justify-between">
            <span className="pill bg-white/85 text-ink backdrop-blur">JiXin 机信, machine credit</span>
            <span className="pill bg-white/85 text-ink backdrop-blur">Shenzhen FinTechathon 2026, Topic F</span>
          </div>
          <div className="pointer-events-auto max-w-xl rounded-3xl bg-white/80 p-6 shadow-[0_20px_60px_-30px_rgba(27,42,42,0.45)] backdrop-blur-md md:p-8">
            <h1 className="display text-4xl text-ink md:text-6xl">Machines that earn, pay and post a bond.</h1>
            <p className="mt-4 max-w-md text-base text-ink-2">A wallet standard for drones, humanoids and agents. Paid per verified unit of work, slashed on proof, owned once the lease is paid.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/app/fleet" className="btn btn-ink">Watch a drone pay off its lease</Link>
              <Link href="/app/evidence" className="btn btn-ghost">Verify it yourself</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["20", "attack cases blocked, as proof"], ["3", "contracts"], ["0", "human decisions per task"], ["2", "sides, one rail"]].map(([v, l]) => (<div key={l} className="tile"><div className="kpi">{v}</div><div className="mt-1 text-xs text-muted">{l}</div></div>))}
      </div>

      <section className="mt-6">
        <h2 className="text-2xl font-bold tracking-tight">Drones first. Where else it applies</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {uses.map((u) => (<div key={u.who} className="card p-4"><div className="text-xs font-semibold text-turq-deep">{u.who}</div><p className="mt-2 text-sm text-ink-2">{u.line}</p></div>))}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-5">
          <h2 className="text-2xl font-bold tracking-tight">What the competition requires</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">{requirements.map((r) => <li key={r} className="rounded-xl bg-cream px-3 py-2 text-sm text-ink-2">{r}</li>)}</ul>
        </div>
        <div className="grad-up grad card p-5 text-ink">
          <h2 className="text-2xl font-bold tracking-tight">How it scores</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2">{scoring.map(([w, n, h]) => <li key={n} className="rounded-xl bg-white/80 p-3 backdrop-blur"><div className="kpi">{w}</div><div className="mt-1 text-sm font-semibold">{n}</div><div className="text-xs text-ink-2">{h}</div></li>)}</ul>
        </div>
      </section>

      <section className="card mt-4 p-5 text-white" style={{ background: "#1b2a2a" }}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight">What no other entry has</h2>
          <span className="text-xs text-white/60">about 150 public entries read</span>
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">{firsts.map((f) => <li key={f} className="rounded-xl bg-white/10 px-3 py-2 text-sm">{f}</li>)}</ul>
        <div className="mt-4 flex gap-2"><Link href="/app" className="btn btn-turq">Open mission control</Link><a href="https://github.com/KarinaKKarinaK/shenzhen-fintechathon" target="_blank" rel="noreferrer" className="btn" style={{ background: "rgba(255,255,255,0.1)", color: "white" }}>Design and research</a></div>
      </section>
      <footer className="px-2 py-6 text-xs text-muted">JiXin 机信 rhymes with WeChat and sits next to WeBank's own naming. A homophone of 积信, accumulated trust, which is what the on chain record becomes.</footer>
    </div>
  );
}
