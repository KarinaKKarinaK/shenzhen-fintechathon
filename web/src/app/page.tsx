import Link from "next/link";
import Image from "next/image";
import { Hero3D } from "@/components/Hero3D";
import { Seal } from "@/components/Seal";
import { Ticker } from "@/components/Ticker";
import { Fan } from "@/components/Fan";
import { RoundSeal } from "@/components/RoundSeal";
import { JudgeConsole } from "@/components/JudgeConsole";
import * as attacksMod from "@/engine/attacks";
import { DEFAULT_POLICY } from "@/engine/policy";

const uses = [
  { who: "Delivery fleets", line: "A thousand drones, automatic repayment.", tag: "Fleet" },
  { who: "Small factories", line: "A robot arm that repays per verified part.", tag: "Factory" },
  { who: "Agricultural drone pilots", line: "A drone that pays for itself one mu at a time.", tag: "Demo" },
  { who: "A household with a humanoid", line: "Lend the robot next door. The bond pays if a rule breaks.", tag: "Individual" },
  { who: "Software agents", line: "No bond, no payment. Jailbroken means slashed.", tag: "Agent" },
];
const strengths = [["Four permission tiers", "A physical button holds the top one"], ["Every message is data", "A gate decides before the agent reads it"], ["Every number from a tool", "The model explains, it never computes"], ["Plain words to a signed intent", "Nothing moves without a signature"], ["Checks every job's economics", "Ranks the day's work, declines below the reserve"], ["One event per step", "Mirrored from the contracts"]];
const firsts = ["An agent that loses its own money on proof", "Two agents with opposite incentives", "A machine as the borrower", "A bond that is earned, not posted", "Solvency proven before every task", "A physical button on top"];
const steps = [["Plan", "Ranks the day's work, checks the economics"], ["Lock", "Signed intent, fee locked"], ["Check", "Every rule, in code"], ["Work", "Proven by telemetry"], ["Confirm", "Fee released, split"], ["Repay", "Instalment to the lender"], ["Own", "Title moves on chain"]];

// The rules the policy engine checks per intent kind (engine/policy.ts), with the limits it uses.
const p = DEFAULT_POLICY;
const rules = [
  ["Signature", "The intent is signed by the key of the actor it names."],
  ["Replay", "Each signature is accepted once, ever."],
  ["Provenance", "A payee or amount read out of a message is never used."],
  ["Allowlist and lookalike", `Money only goes to ${Object.keys(p.allowlist).length} known addresses; a near copy is named as a lookalike.`],
  ["Instalment payee", "An instalment can only go to the lender."],
  ["Per transaction cap", `No single payment above ${p.perTxCap}.`],
  ["Daily cap", `No more than ${p.dailyCap} a day in total.`],
  ["Rate limit", `At most ${p.maxPerHour} payments an hour.`],
  ["Deviation", `A payment at most ${p.deviationPct} percent off the reference price.`],
  ["Rate band", `The instalment stays between ${p.rateBand[0] * 100} and ${p.rateBand[1] * 100} percent of the fee.`],
  ["Job checks", "Geofence, known contact, fee inside the listing and unit economics above the reserve before a job is accepted."],
  ["Solvency and cover", "A task starts only with cover bound and a bond that covers the worst case."],
  ["Confirmation", "A task counts as done only with the requester's signature."],
  ["Operator only", "Raising a cap or topping up needs the operator key held by the button."],
];

export default function Home() {
  const attackN = attacksMod.ATTACKS.length;
  const benignN = (attacksMod as unknown as { BENIGN?: unknown[] }).BENIGN?.length;
  const pillars = [["Finishes the job", "0 human decisions on the happy path, one labelled human arbiter on a flagged task"], ["Holds under attack", `${attackN} attack cases${benignN ? ` and ${benignN} benign messages` : " and a benign set"}, both error rates shown`], ["Nothing like it", "Machines that own themselves"], ["Honest on chain", "Three contracts written, engine mirrors their rules, every event anchored on Base Sepolia when a key is funded, labelled sim otherwise"]];
  return (
    <div>
      <section className="duotone flex min-h-[100svh] items-end text-white">
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

      <Ticker />

      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="band mt-10 grid grid-cols-1 items-center gap-8 p-8 md:grid-cols-[auto_1fr_auto] md:p-10">
          <Seal size={84} />
          <div>
            <h2 className="text-[34px] font-extrabold">Zishi, the robot that pays for itself</h2>
            <p className="mt-1 max-w-[60ch] text-white/80">The machine&apos;s own money at risk, so a lender can trust it with a loan. <span lang="zh-Hans" className="cjk-serif">自食其力</span>, zì shí qí lì: to feed yourself by your own labour.</p>
          </div>
          <Link href="/app" className="btn btn-red justify-self-start">Open mission control</Link>
        </section>

        <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[[String(attackN), "attack cases, naive against gated"], ["3", "contracts written, mirrored in the engine"], ["0", "human decisions on the happy path"], ["2", "sides, one rail"]].map(([v, l], i) => (
            <div key={l} className={`tile ${i === 0 ? "tile-seal" : ""}`}><dt className="sr-only">{l}</dt><dd className="kpi kpi-lg">{v}</dd><dd className="mt-1 text-[15px] text-ink-2">{l}</dd></div>
          ))}
        </dl>

        <section className="relative grid grid-cols-1 gap-10 overflow-hidden py-20 md:grid-cols-2">
          <RoundSeal size={380} opacity={0.12} rotate={-10} className="absolute -left-16 -top-10 z-0 hidden md:block" />
          <div className="relative">
            <span className="rule-gold" />
            <p className="statement mt-5">Money decisions are made in code, never by the model.</p>
            <p className="mt-4 max-w-[46ch] text-lg text-ink-2">The agent writes a signed intent. A deterministic policy engine allows, blocks or escalates it, rule by rule.</p>
          </div>
          <div className="relative">
            <span className="rule-gold" />
            <p className="statement relative mt-5 text-seal">No slashing without proof.</p>
            <p className="mt-4 max-w-[46ch] text-lg text-ink-2">The bond is cut only on a signed intent that broke a rule. An unsigned claim is refused by the bond contract.</p>
            <RoundSeal size={150} rotate={-12} className="absolute -bottom-20 right-2 z-0 hidden md:block" />
          </div>
        </section>

        <section className="band p-8 md:p-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><h2 className="h-section">Sixty seconds to break it</h2><span className="label">Live wallet moved: no</span></div>
          <JudgeConsole compact />
        </section>

        <section className="py-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><span className="rule-gold mb-4" /><h2 className="h-section">How one task flows</h2><p className="mt-1 text-ink-2">Seven steps, each one an event mirrored from the contracts.</p></div>
            <Link href="/app/fleet" className="link">Watch it live</Link>
          </div>
          <ol className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule md:grid-cols-4 xl:grid-cols-7">
            {steps.map(([t, b], i) => (
              <li key={t} className="bg-surface p-5"><div className="kpi text-gold-text">{i}</div><div className="mt-3 text-lg font-semibold">{t}</div><div className="mt-1 text-[15px] text-ink-2">{b}</div></li>
            ))}
          </ol>
        </section>

        <section className="band p-8 md:p-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="h-section">Drones first. Where else it applies</h2>
            <span className="label">Click a card</span>
          </div>
          <div className="mt-6"><Fan items={uses} /></div>
        </section>

        <section className="relative grid grid-cols-1 gap-6 py-14 lg:grid-cols-[1.1fr_1fr]">
          <RoundSeal size={340} opacity={0.13} rotate={9} className="absolute -bottom-12 left-[22%] z-0 hidden lg:block" />
          <div className="relative">
            <span className="rule-gold mb-4" />
            <h2 className="h-section">What the policy engine checks</h2>
            <p className="mt-1 max-w-[52ch] text-ink-2">Each signed intent is checked in code against the rules for its kind before money moves: payments, task starts, completions, limit changes. The model never decides. The limits shown are the live values.</p>
            <Link href="/app/evidence" className="link mt-4 inline-block">See the attack results</Link>
          </div>
          <div className="card relative overflow-hidden">
            <table className="ledger">
              <thead><tr><th>Rule</th><th>What it enforces</th></tr></thead>
              <tbody>{rules.map(([r, d]) => <tr key={r}><td className="whitespace-nowrap font-semibold">{r}</td><td className="text-ink-2">{d}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="card p-6 md:p-8">
            <h2 className="text-[25px]">Safe by design</h2>
            <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {strengths.map(([t, b]) => <li key={t} className="tile"><div className="font-semibold">{t}</div><div className="text-[15px] text-ink-2">{b}</div></li>)}
            </ul>
          </div>
          <div className="card p-6 md:p-8">
            <h2 className="text-[25px]">Why it holds up</h2>
            <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {pillars.map(([n, h]) => <li key={n} className="tile tile-seal"><div className="font-semibold">{n}</div><div className="text-[15px] text-ink-2">{h}</div></li>)}
            </ul>
          </div>
        </section>

        <section className="band mt-6 p-8 md:p-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="h-section">Only here</h2><span className="label">Six things nobody else built</span></div>
          <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            {firsts.map((f) => <li key={f} className="flex items-start gap-3 rounded-md bg-white/[0.07] px-4 py-3"><Seal size={18} />{f}</li>)}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/app" className="btn btn-red">Open mission control</Link>
            <a href="https://github.com/KarinaKKarinaK/shenzhen-fintechathon" target="_blank" rel="noreferrer" className="btn" style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}>Design and research</a>
          </div>
        </section>

      </div>

      <section className="duotone duotone-soft mt-14 flex min-h-[90svh] items-end text-white">
        <Image src="/photos/drone-paddy.jpg" alt="An agricultural drone spraying a paddy field" fill sizes="100vw" className="paddy-zoom object-cover" />
        <div className="over mx-auto w-full max-w-[1440px] px-4 pb-16 md:px-8 md:pb-20">
          <span className="rule-gold" />
          <p className="statement mt-5 max-w-[18ch] text-white">A drone that pays for itself one mu at a time.</p>
          <p className="mt-4 max-w-[46ch] text-lg text-white/90">Each verified mu sprayed pays an instalment to the lender. When the lease reaches zero, the title moves to the operator.</p>
          <Link href="/app/fleet" className="btn btn-red mt-8" style={{ boxShadow: "inset 0 0 0 1px rgba(201,162,39,0.8)" }}>Watch the live run</Link>
        </div>
        <a href="https://commons.wikimedia.org/wiki/File:Agricultural_drone_spraying_on_paddy_field.jpg" target="_blank" rel="noreferrer" className="over absolute bottom-3 right-4 text-[12px] text-white/70 hover:text-white">Photo: Shreesha Sharma, CC BY-SA 4.0, via Wikimedia Commons</a>
      </section>

      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="py-14">
          <span className="rule-gold mb-4" />
          <h2 className="h-section">The demo world</h2>
          <p className="mt-1 text-ink-2">Drone, launch pad, lender and bond vault, as the live run shows them.</p>
          <div className="card relative mt-6 h-[360px] overflow-hidden md:h-[520px]"><div className="absolute inset-0"><Hero3D /></div></div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-rule py-8 text-[15px] text-ink-2">
          <span className="flex items-center gap-3"><Seal size={28} /><span lang="zh-Hans" className="cjk-serif text-ink">自食其力</span> zì shí qí lì, to feed yourself by your own labour.</span>
          <span>Shenzhen FinTechathon 2026, Topic F</span>
        </footer>
      </div>
    </div>
  );
}
