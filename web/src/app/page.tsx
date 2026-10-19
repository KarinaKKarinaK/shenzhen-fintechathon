import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Hero3D } from "@/components/Hero3D";

const uses = [
  { who: "Agricultural drone pilots", title: "A drone that pays for itself one mu at a time", body: "Over 200,000 pilots in China spray fields for 3 to 15 yuan per mu and pay about 55,000 yuan for the drone up front. On the rail the lender finances it, every verified mu pays an instalment from the flight log, and the title moves to the pilot when it is paid. Data driven credit for people with nothing to pledge but the machine.", judge: "Inclusive finance" },
  { who: "Delivery and logistics fleets", title: "A thousand drones with automatic repayment", body: "Each machine is a bonded wallet. Fees come in per confirmed delivery, instalments go out by rule, counterparties such as charging pads are paid without accounts payable, and the lender reads repayment and exposure from chain. Capital priced on verifiable repayment, no reconciliation.", judge: "Real scenario, real execution" },
  { who: "A household with a humanoid", title: "Lend the robot to the neighbour for an afternoon", body: "The owner lists allowed tasks, hours and a geofence once with the button. The neighbour's agent and the robot's agent settle terms. The fee locks, the robot works inside the fence, the neighbour confirms, the fee splits into owner share, instalment, rail fee and bond. If the robot breaks a rule the neighbour is paid from the bond without a lawsuit.", judge: "Individuals, both sides protected" },
  { who: "Small factories", title: "A robot arm that repays its own lease per part", body: "The counter and a plausibility check verify parts made. Repayment per verified part, frozen on tampered data. The same bond, the same lease contract, the same title transfer. Credit for workshops that no bank underwrites today.", judge: "Data driven credit" },
  { who: "Software agents", title: "An agent that must post a bond before it may pay", body: "A procurement or payment agent is a wallet on the same standard. Its vendor stakes the bond. If it is jailbroken and tries a forbidden payment, the signed intent is the proof, the bond pays, and the hunter who found it gets the bounty.", judge: "Risk control for agent wallets" },
];

const requirements = [
  { name: "Permission hierarchy", where: "Four tiers in code. Read, draft, execute within caps, and a physical button for anything that raises a cap, widens a geofence or tops up a bond. The model cannot press the button." },
  { name: "Injection defense", where: "Every inbound message is wrapped as untrusted data with an escaped block, a judge gate can pass, redact, hold or refuse, and payees never come from text. Twenty attack cases run live on the evidence page." },
  { name: "Hallucination prevention", where: "Every number comes from a tool. The economics check, the split, the instalment and the plausibility check are functions. The model only writes the explanation sentence." },
  { name: "Intent understanding", where: "A request in plain language becomes a typed, signed intent with a job id, a fee, a geofence and a window before anything is evaluated." },
  { name: "Task planning", where: "Price, route, schedule and reserve rule are planned by the machine agent, and unprofitable jobs are declined with the reason shown." },
  { name: "On-chain execution", where: "Bond, job and lease contracts. Every fee, instalment, slash, bounty and title transfer is a transaction with a hash. Simulated by default and labelled, real on Base Sepolia with a funded key." },
];

const scoring = [
  { w: "40", name: "Task completion", how: "Paid work end to end with no human: economics, cover, task, confirmation, fee in, instalment out, bond filling, title transferred. One hash per step." },
  { w: "30", name: "Security and compliance", how: "Bond slashed by proof, not by us. Message gate, policy engine, geofence and confirmation rules, fraud control on work done, twenty attacks with results, honest self assessment." },
  { w: "30", name: "Innovation and interaction", how: "Machines that earn, pay and own themselves. Agents with money at risk. A neighbour hiring a bonded robot. Mission control with a live 3D scene and a judge console." },
  { w: "+5", name: "On-chain challenge", how: "Three contracts on a public testnet with verified source. Same bytecode on a FISCO BCOS node for the production story." },
];

const firsts = [
  "An agent with consequences. It locks its own money before it may act, and loses it on cryptographic proof of a violation. No trusted party decides.",
  "Two agents with opposite incentives transacting: machine and lender, robot and neighbour.",
  "A machine as the borrower. Income per verified unit of work, automatic repayment, title transfer on chain.",
  "The bond is earned, not posted, so people with nothing to pledge can start.",
  "An attacker as a feature. The hunter is paid from bonds for proven violations in a shadow run.",
  "A physical button as the top permission tier. The only key that can raise a cap.",
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm md:flex" aria-label="Page">
          <a href="#uses" className="hover:text-teal-deep">Who it is for</a>
          <a href="#flow" className="hover:text-teal-deep">How it works</a>
          <a href="#requirements" className="hover:text-teal-deep">Requirements</a>
          <a href="#scoring" className="hover:text-teal-deep">Scoring</a>
          <a href="#firsts" className="hover:text-teal-deep">What is new</a>
        </nav>
        <Link href="/app" className="btn btn-ink">Open mission control</Link>
      </header>

      <section className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-6 pb-16 pt-6 lg:grid-cols-[1fr_1.15fr] lg:items-center">
        <div>
          <p className="text-sm text-ink-2">Shenzhen FinTechathon 2026, International Track, Topic F</p>
          <h1 className="serif mt-3 text-5xl leading-[1.02] md:text-7xl">A wallet for machines that earn, pay and post a bond.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2">A drone, a humanoid or a software agent gets paid per verified unit of work, pays its lender and its costs to other agents, keeps money at risk that is slashed on proof of a violation, and owns itself once the lease is paid.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/app/neighbourhood" className="btn btn-teal">Watch a robot work for a neighbour</Link>
            <Link href="/app/fleet" className="btn btn-ghost">Watch a drone pay off its lease</Link>
            <Link href="/app/attack" className="btn btn-ghost">Try to break it</Link>
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-line pt-5 text-sm">
            <div><dt className="text-muted">Attack cases</dt><dd className="serif text-3xl">20</dd></div>
            <div><dt className="text-muted">Contracts</dt><dd className="serif text-3xl">3</dd></div>
            <div><dt className="text-muted">Human decisions per task</dt><dd className="serif text-3xl">0</dd></div>
          </dl>
        </div>
        <div className="card-dark grain grain-dark relative overflow-hidden" style={{ height: 520 }}>
          <div className="absolute inset-0"><Hero3D /></div>
          <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/10 bg-night/70 px-3 py-2 text-xs text-[#cfe3df] backdrop-blur">Drag to look around. Dots are money moving between the machine, the lender and the bond.</div>
        </div>
      </section>

      <section id="uses" className="border-t border-line bg-paper-2/60 py-16">
        <div className="mx-auto max-w-[1400px] px-6">
          <h2 className="serif text-4xl md:text-5xl">One rail, five kinds of worker</h2>
          <p className="mt-3 max-w-2xl text-ink-2">The demo shows a drone and a humanoid. The same three contracts and the same rules serve all of these.</p>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {uses.map((u) => (
              <article key={u.who} className="card flex flex-col p-5">
                <div className="text-sm text-teal-deep">{u.who}</div>
                <h3 className="serif mt-1 text-2xl leading-tight">{u.title}</h3>
                <p className="mt-3 flex-1 text-sm text-ink-2">{u.body}</p>
                <div className="mt-4 text-xs text-muted">What a judge sees: {u.judge}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="flow" className="py-16">
        <div className="mx-auto max-w-[1400px] px-6">
          <h2 className="serif text-4xl md:text-5xl">How one task flows</h2>
          <ol className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {["A request arrives as untrusted data. The gate passes, redacts, holds or refuses it.", "The machine agent prices the task with a tool. Below the reserve rule it declines and says why.", "The signed intent goes through the policy engine. Allowlist, caps, geofence, cover.", "The fee locks on the job contract. The bond must cover the worst case or the task does not start.", "The machine works. Its secure element proves where and for how long. The requester confirms.", "The fee splits by rule: owner, instalment, rail, bond. At zero lease the title moves on chain."].map((s, i) => (
              <li key={i} className="card p-4 text-sm"><div className="serif text-2xl text-teal-deep">{i + 1}</div><p className="mt-2 text-ink-2">{s}</p></li>
            ))}
          </ol>
          <div className="card-dark grain grain-dark mt-6 p-6">
            <h3 className="serif text-2xl">When the agent breaks a rule</h3>
            <p className="mt-2 max-w-3xl text-[#cfe3df]">Every action is signed before the policy engine sees it. A signed intent that breaks a rule the contract can check is proof. Anyone can submit it. The bond contract verifies the signature and the rule, slashes, and pays the submitter a bounty. The lender reads the slash and tightens the rate band. Only the operator's physical button can top the bond up. That is accountability without a human in the loop, and it is what lets a lender trust a machine with a loan.</p>
          </div>
        </div>
      </section>

      <section id="requirements" className="border-t border-line bg-paper-2/60 py-16">
        <div className="mx-auto max-w-[1400px] px-6">
          <h2 className="serif text-4xl md:text-5xl">What the competition requires, and where it lives</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {requirements.map((r) => (<div key={r.name} className="card p-5"><h3 className="font-semibold">{r.name}</h3><p className="mt-2 text-sm text-ink-2">{r.where}</p></div>))}
          </div>
        </div>
      </section>

      <section id="scoring" className="py-16">
        <div className="mx-auto max-w-[1400px] px-6">
          <h2 className="serif text-4xl md:text-5xl">How it scores</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {scoring.map((s) => (<div key={s.name} className="card p-5"><div className="serif text-5xl text-teal-deep">{s.w}</div><h3 className="mt-2 font-semibold">{s.name}</h3><p className="mt-2 text-sm text-ink-2">{s.how}</p></div>))}
          </div>
        </div>
      </section>

      <section id="firsts" className="border-t border-line bg-ink py-16 text-paper">
        <div className="mx-auto max-w-[1400px] px-6">
          <h2 className="serif text-4xl md:text-5xl">What no other entry has</h2>
          <p className="mt-3 max-w-2xl text-[#cfe3df]">We read about 150 public entries for this track. Every one is a single assistant that proposes, with code that decides and a human that confirms. None of these six exist anywhere in the field.</p>
          <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {firsts.map((f, i) => (<li key={i} className="rounded-2xl border border-white/10 bg-night p-5 text-sm text-[#e6f2ef]">{f}</li>))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/app" className="btn btn-teal">Open mission control</Link>
            <a href="https://github.com/KarinaKKarinaK/shenzhen-fintechathon" className="btn btn-ghost border-white/20 text-paper hover:bg-white/5" target="_blank" rel="noreferrer">Read the design and the research</a>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted">
        <Logo size={22} />
        <span>Agents decide nothing about money. Tools compute, contracts enforce, the button approves.</span>
      </footer>
    </div>
  );
}
