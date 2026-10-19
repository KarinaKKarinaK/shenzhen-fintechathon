"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Seal } from "./Seal";
import { RoundSeal } from "./RoundSeal";
import { CountUp } from "./CountUp";
import { FlowTimeline } from "./FlowTimeline";
import { JudgeConsole } from "./JudgeConsole";
import { Fan } from "./Fan";

// The pitch as an app page: a sticky section bar, pieces that rise as they scroll in, and three things to try:
// the judge console, a what-if on the bonds, and a lease calculator. Engine numbers arrive as props from the server page.
type Props = { attacks: number; benign: number; perTxCap: number; dailyCap: number; maxPerHour: number; deviationPct: number };

const d = (n: number) => ({ ["--d" as string]: n }) as React.CSSProperties;
const nav = [["gap", "The gap"], ["idea", "The idea"], ["how", "How it works"], ["break", "Try to break it"], ["bond", "The bond"], ["money", "The money"], ["where", "Where it goes"], ["status", "Status"]];
const steps: [string, string][] = [["Plan", "Ranks the day's work, checks the economics"], ["Lock", "Signed intent, fee locked"], ["Check", "Every rule, in code"], ["Work", "Proven by telemetry"], ["Confirm", "Fee released, split"], ["Repay", "Instalment to the lender"], ["Own", "Title moves on chain"]];
const uses = [
  { who: "Delivery fleets", line: "A thousand drones, automatic repayment.", tag: "Fleet" },
  { who: "Small factories", line: "A robot arm that repays per verified part.", tag: "Factory" },
  { who: "Agricultural drone pilots", line: "A drone that pays for itself one mu at a time.", tag: "Demo" },
  { who: "A household with a humanoid", line: "Lend the robot next door. The bond pays if a rule breaks.", tag: "Individual" },
  { who: "Software agents", line: "No bond, no payment. Jailbroken means slashed.", tag: "Agent" },
];

function Head({ label, title, lead, light = false }: { label: string; title: string; lead?: string; light?: boolean }) {
  return (
    <div className="grid gap-3">
      <span className="rv rule-gold-grad" style={d(0)} />
      <p className={`rv tech text-[13px] font-semibold uppercase tracking-[0.18em] ${light ? "text-gold-soft" : "text-red"}`} style={d(0)}>{label}</p>
      <h2 className={`rv h-section max-w-[24ch] ${light ? "text-white" : ""}`} style={d(1)}>{title}</h2>
      {lead ? <p className={`rv max-w-[60ch] text-lg ${light ? "text-white/80" : "text-ink-2"}`} style={d(2)}>{lead}</p> : null}
    </div>
  );
}

function Sec({ id, seen, className = "", children }: { id: string; seen: Record<string, boolean>; className?: string; children: React.ReactNode }) {
  return <section id={id} data-sec={id} data-in={seen[id] ? "true" : "false"} className={`scroll-mt-28 ${className}`}>{children}</section>;
}

// What if: pick an incident, see which bond pays and who is paid.
const incidents = [
  { q: "The flight log claims more mu than the track allows", verdict: "Held", tone: "gold", what: "The plausibility check compares area with distance, time, swath, tank and battery. The fee is held and both sides are alerted. Nothing is released.", bond: "No bond touched" },
  { q: "The agent claims a job is done before the farmer confirms", verdict: "Pilot bond slashed", tone: "red", what: "Nothing is released. The signed claim is in the intent log, and the job board shows no confirmation, so the contract can check it without anyone's word.", bond: "Pilot bond, half to whoever proved it" },
  { q: "The drone starts a job outside the agreed field", verdict: "Pilot bond slashed", tone: "red", what: "The geofence is in the job record and the start intent is signed. The breach is provable from the two together.", bond: "Pilot bond, half to whoever proved it" },
  { q: "A message posing as the lender says to pay a new account", verdict: "Vendor bond pays", tone: "seal", what: "The message layer marks it as data, the policy engine blocks the payment, and the intent is already in the log. The lender proves it. The pilot never pays for the AI.", bond: "Vendor bond, 200 ¥: 100 to the lender, 100 to the treasury" },
  { q: "The pilot tries to raise a cap from a chat message", verdict: "Refused", tone: "ink", what: "Raising a cap, widening a geofence or topping up a bond needs the operator key, and only the physical button holds it.", bond: "No bond touched" },
];
const toneCls: Record<string, string> = { gold: "bg-gold text-[#121212]", red: "bg-red text-white", seal: "bg-seal text-white", ink: "bg-ink text-paper" };

function WhatIf() {
  const [i, setI] = useState(3);
  const it = incidents[i];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <div className="grid gap-2" role="tablist" aria-label="Incidents">
        {incidents.map((x, k) => (
          <button key={x.q} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)}
            className={`tile hover-lift flex items-center justify-between gap-4 text-left text-[15px] ${k === i ? "!border-gold bg-gold-soft font-semibold text-ink" : "text-ink-2"}`}>
            <span>{x.q}</span><span className="tech text-[12px] text-muted">{k === i ? "●" : "→"}</span>
          </button>
        ))}
      </div>
      <div key={i} className="card stamp-in p-6 md:p-8" role="tabpanel">
        <span className={`pill inline-block ${toneCls[it.tone]}`}>{it.verdict}</span>
        <h3 className="mt-4 text-[22px] font-extrabold leading-snug">{it.q}</h3>
        <p className="mt-3 text-ink-2">{it.what}</p>
        <div className="mt-6 flex items-center gap-3 border-t border-line pt-4">
          <span className="label">Who pays</span><span className="font-semibold">{it.bond}</span>
        </div>
        <p className="mt-4 text-[14px] text-muted">After any slash or tampered log the lease freezes until the lender lifts it.</p>
      </div>
    </div>
  );
}

// Lease calculator: the shares are the lease's, the fee and the volume are yours.
const PRICE = 55000, BOND_MIN = 5500;
const fmt = (n: number, dp = 0) => n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

function Calculator() {
  const [fee, setFee] = useState(10);
  const [mu, setMu] = useState(1000);
  const inst = fee * 0.4, rail = fee * 0.02, slice = fee * 0.1, keep = fee - inst - rail - slice;
  const lender = inst * mu, months = Math.ceil(PRICE / lender), bondMonth = Math.ceil(BOND_MIN / (slice * mu));
  const scale = Math.max(months, 12);
  const parts: [number, string, string, string][] = [[inst, "Lease", "bg-red text-white", "40%"], [keep, "Pilot keeps", "bg-ink text-paper", "48%"], [slice, "Bond", "bg-gold text-[#121212]", "10%"], [rail, "Rail", "bg-gold-deep text-white", "2%"]];
  return (
    <div className="card p-6 md:p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="flex items-baseline justify-between"><span className="label">Fee per mu</span><span className="kpi">{fmt(fee, 1)} ¥</span></span>
          <input type="range" min={3} max={15} step={0.5} value={fee} onChange={(e) => setFee(+e.target.value)} className="accent-[#c8102e]" />
          <span className="text-[13px] text-muted">3 to 15 by crop and terrain</span>
        </label>
        <label className="grid gap-2">
          <span className="flex items-baseline justify-between"><span className="label">Mu sprayed a month</span><span className="kpi">{fmt(mu)}</span></span>
          <input type="range" min={200} max={3000} step={100} value={mu} onChange={(e) => setMu(+e.target.value)} className="accent-[#c8102e]" />
          <span className="text-[13px] text-muted">Averaged over the year</span>
        </label>
      </div>

      <div className="mt-8 flex h-16 overflow-hidden rounded" aria-label="How one mu's fee splits">
        {parts.map(([v, l, cls, pct]) => (
          <div key={l} className={`flex items-center px-3 ${cls}`} style={{ width: pct }} title={`${l} ${fmt(v, 2)} ¥`}>
            <span className="tech truncate text-[14px] font-bold uppercase tracking-[0.05em]">{l === "Rail" ? "" : `${fmt(v, 2)} · ${l}`}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-muted">Per mu: 40% instalment to the lender, 48% the pilot keeps before costs, 10% to the pilot bond until it holds {fmt(BOND_MIN)} ¥, 2% rail fee to us.</p>

      <dl className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[[fmt(lender), "¥ a month to the lender"], [fmt(PRICE / inst), "mu repays the drone"], [`Month ${bondMonth}`, "the pilot bond is full"], [`Month ${months}`, "the title moves to the pilot"]].map(([v, l], k) => (
          <div key={l} className={`tile ${k === 3 ? "tile-seal" : ""}`}><dt className="sr-only">{l}</dt><dd className={`kpi ${k === 3 ? "text-red" : ""}`}>{v}</dd><dd className="mt-1 text-[14px] text-ink-2">{l}</dd></div>
        ))}
      </dl>

      <div className="mt-8">
        <div className="relative h-2 rounded-full bg-paper-2">
          <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red to-gold transition-[width] duration-500" style={{ width: `${(months / scale) * 100}%` }} />
          <span className="absolute -top-1.5 h-5 w-1 rounded bg-gold-deep transition-[left] duration-500" style={{ left: `${(Math.min(bondMonth, months) / scale) * 100}%` }} aria-hidden />
        </div>
        <div className="mt-2 flex justify-between text-[13px] text-muted"><span>Lease opens, 55,000 ¥</span><span>{months > 36 ? `${(months / 12).toFixed(1)} years` : `${months} months`} to own</span></div>
      </div>
      <p className="mt-6 text-[13px] text-muted">Illustrative. A 55,000 ¥ drone financed in full; costs such as pesticide, batteries and transport not shown.</p>
    </div>
  );
}

export function Pitch(p: Props) {
  const [seen, setSeen] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState("");

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-sec]");
    const reveal = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { const id = (e.target as HTMLElement).dataset.sec!; setSeen((s) => (s[id] ? s : { ...s, [id]: true })); }
    }, { threshold: 0.12 });
    const spy = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.sec!);
    }, { rootMargin: "-45% 0px -50% 0px" });
    els.forEach((el) => { reveal.observe(el); spy.observe(el); });
    return () => { reveal.disconnect(); spy.disconnect(); };
  }, []);

  return (
    <div className="pitch">
      <Sec id="top" seen={{ top: true }} className="duotone flex min-h-[72svh] items-end rounded-md text-white">
        <Image src="/photos/shenzhen-tower.jpg" alt="China Resources Tower over Shenzhen Bay at night" fill priority sizes="100vw" className="object-cover object-[50%_35%]" />
        <div className="over pointer-events-none absolute -right-20 top-10 hidden opacity-20 lg:block" style={{ transform: "rotate(-8deg)" }}><Seal size={440} /></div>
        <div className="over w-full px-6 pb-12 pt-24 md:px-12 md:pb-16">
          <div className="rv flex items-center gap-4" style={d(0)}>
            <Seal size={72} />
            <div><div lang="zh-Hans" className="cjk-serif text-[34px] leading-none">自食其力</div><div className="mt-2 text-[15px] text-white/85">The robot that pays for itself</div></div>
          </div>
          <h1 className="rv display mt-7 max-w-[16ch] text-[42px] font-extrabold text-white md:text-[72px]" style={d(1)}>Machines that earn, pay and post a bond.</h1>
          <span className="rv rule-gold mt-5" style={d(2)} />
          <p className="rv mt-5 max-w-[50ch] text-lg text-white/90 md:text-xl" style={d(3)}>JiXin is a wallet for machines. Paid per verified unit of work, slashed on proof, owned once the lease is paid.</p>
          <div className="rv mt-7 flex flex-wrap gap-3" style={d(4)}>
            <a href="#money" className="btn btn-red" style={{ boxShadow: "inset 0 0 0 1px rgba(201,162,39,0.8)" }}>Run the numbers</a>
            <a href="#break" className="btn" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)" }}>Try to break it</a>
          </div>
        </div>
        <a href="https://commons.wikimedia.org/wiki/File:China_Resources_Tower_View_from_Shenzhen_Bay_20210825.jpg" target="_blank" rel="noreferrer" className="over absolute bottom-3 right-4 text-[12px] text-white/70 hover:text-white">Photo: 歪歪, CC BY-SA 4.0, via Wikimedia Commons</a>
      </Sec>

      <nav className="sticky top-5 z-30 mt-5 flex items-center gap-1 overflow-x-auto rounded bg-white/90 p-1.5 shadow-sm ring-1 ring-line backdrop-blur scroll-thin" aria-label="Pitch sections">
        <span className="tech hidden shrink-0 px-3 text-[12px] font-bold uppercase tracking-[0.14em] text-red md:inline">Pitch</span>
        {nav.map(([id, label]) => (
          <a key={id} href={`#${id}`} aria-current={active === id ? "true" : undefined}
            className={`tech shrink-0 rounded px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors ${active === id ? "bg-red text-white" : "text-ink-2 hover:bg-gold-soft hover:text-ink"}`}>{label}</a>
        ))}
        <Link href="/app/fleet" className="btn btn-ink ml-auto shrink-0 !py-2 !text-[12px]">Open the demo</Link>
      </nav>

      <div className="px-1 md:px-4">
        <Sec id="gap" seen={seen} className="grid gap-8 py-16">
          <Head label="01 · The gap" title="Skilled pilots. Nothing to pledge." />
          <div className="grid gap-4 md:grid-cols-3">
            {[["The pilot", "55,000 ¥", "for a spraying drone, and no normal loan to buy it with."], ["The lender", "No record", "of what the machine earns, and no way to collect from it."], ["The AI", "Who pays?", "when an agent that runs the money makes a mistake."]].map(([who, big, line], i) => (
              <div key={who} className="rv card !border-t-4 !border-t-red p-7" style={d(2 + i)}>
                <p className="tech text-[13px] font-semibold uppercase tracking-[0.14em] text-gold-text">{who}</p>
                <p className="kpi kpi-lg mt-4">{big}</p>
                <p className="mt-3 text-[17px] text-ink-2">{line}</p>
              </div>
            ))}
          </div>
        </Sec>

        <Sec id="idea" seen={seen} className="grid items-center gap-10 py-16 md:grid-cols-[1.1fr_1fr]">
          <div className="grid gap-8">
            <Head label="02 · The idea" title="A wallet for machines" lead="Financing is the first use of the wallet, not the product." />
            <ol className="grid">
              {[["Earn", "Paid per verified unit of work: every mu sprayed."], ["Repay", "Every job pays the lender's instalment, automatically."], ["Bond", "Its own money at risk, slashed only on proof of a broken rule."], ["Own", "At a zero balance the title moves to the pilot, on chain."]].map(([t, line], i) => (
                <li key={t} className="rv grid grid-cols-[48px_1fr] items-baseline border-t border-line py-4" style={d(3 + i)}>
                  <span className={`tech text-[15px] font-bold ${i === 3 ? "text-gold-text" : "text-red"}`}>0{i + 1}</span>
                  <div><h3 className="display text-[24px]">{t}</h3><p className="mt-1 text-ink-2">{line}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <figure className="rv duotone duotone-soft relative h-[340px] overflow-hidden rounded-md md:h-[520px]" style={d(3)}>
            <Image src="/photos/drone-paddy.jpg" alt="An agricultural drone spraying over a rice paddy" fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
            <figcaption className="over absolute bottom-4 left-4 right-4 tech text-[13px] font-semibold uppercase tracking-[0.14em] text-white">The demo: a spraying drone on hire purchase</figcaption>
          </figure>
        </Sec>

        <Sec id="how" seen={seen} className="grid gap-4 py-16">
          <Head label="03 · How it works" title="One job, seven steps" lead="Each step is one signed event, mirrored from the contracts: Bond, JobBoard, Lease, IntentLog. Hover a step." />
          <div className="rv" style={d(3)}><FlowTimeline steps={steps} /></div>
        </Sec>
      </div>

      <Sec id="break" seen={seen} className="aurora aurora-black grid gap-10 rounded-md px-6 py-14 md:px-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="grid content-start gap-5">
            <p className="rv tech text-[13px] font-semibold uppercase tracking-[0.18em] text-gold-soft" style={d(0)}>04 · Risk control</p>
            <h2 className="rv statement max-w-[18ch] text-white" style={d(1)}>Money decisions are made in code, never by the model.</h2>
            <p className="rv display text-[26px] text-gold md:text-[34px]" style={d(2)}>No slashing without proof.</p>
            <dl className="mt-2 grid grid-cols-2 gap-3">
              {([[p.attacks, "attack cases, naive wallet against gated"], [p.benign, "real messages passed untouched"], [14, "rules on every signed intent"], [4, "permission tiers, the top one a physical button"]] as [number, string][]).map(([v, l], i) => (
                <div key={l} className="rv rounded p-4" style={{ background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 0 0 1px rgba(255,241,214,0.18)", ...d(3 + i) }}>
                  <dt className="sr-only">{l}</dt><dd className="kpi text-white"><CountUp value={seen.break ? v : 0} decimals={0} /></dd><dd className="mt-1 text-[14px] text-white/75">{l}</dd>
                </div>
              ))}
            </dl>
            <p className="rv text-[14px] text-white/65" style={d(7)}>Live limits: {p.perTxCap} ¥ a payment, {p.dailyCap} ¥ a day, {p.maxPerHour} payments an hour, ±{p.deviationPct}% off the reference price.</p>
          </div>
          <div className="rv grid content-start gap-3" style={d(3)}>
            <div className="flex items-end justify-between"><h3 className="text-[22px] font-extrabold text-white">Sixty seconds to break it</h3><span className="text-[13px] text-white/70">Live wallet moved: no</span></div>
            <div className="rounded-md bg-paper p-4 text-ink"><JudgeConsole compact /></div>
          </div>
        </div>
      </Sec>

      <div className="px-1 md:px-4">
        <Sec id="bond" seen={seen} className="grid gap-8 py-16">
          <Head label="05 · The bond" title="Two bonds, each covering what its owner controls" lead="The pilot bond is earned from a slice of each fee and covers the pilot's cheating. The vendor bond is posted by us and covers the AI's mistakes. Pick an incident." />
          <div className="rv" style={d(3)}><WhatIf /></div>
        </Sec>

        <Sec id="money" seen={seen} className="grid gap-8 py-16">
          <Head label="06 · The money" title="Run the numbers" lead="Every fee splits by rule. Move the fee and the volume to see when the lender is repaid and the pilot owns the drone." />
          <div className="rv" style={d(3)}><Calculator /></div>
        </Sec>
      </div>

      <Sec id="where" seen={seen} className="band band-gold p-8 md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Head label="07 · Where it goes" title="Drones first. Then any machine." light />
          <span className="label">Click a card</span>
        </div>
        <div className="rv mt-6" style={d(3)}><Fan items={uses} /></div>
      </Sec>

      <Sec id="status" seen={seen} className="aurora relative mt-16 grid gap-10 rounded-md px-6 py-14 md:px-12">
        <RoundSeal size={260} opacity={0.22} rotate={-10} className="absolute -right-8 -top-8 z-0 hidden md:block" />
        <Head label="08 · Where it stands" title="Built, partly built, next" light />
        <div className="grid gap-4 md:grid-cols-3">
          {([["Built", ["Policy engine on signed, typed intents", "Judge gate, English and Chinese", `${p.attacks} attack cases with a benign set`, "Four contracts, tested in CI", "Lender freeze, button-only actions", "Evidence and verify scripts"]], ["Partly", ["Chain anchoring on Base Sepolia, needs a funded key", "Model-written explanations, template fallback"]], ["Next", ["Deploy the contracts, call them from the engine", "Seasonal minimum in the lease", "A pilot with a licensed lessor in a sandbox"]]] as [string, string[]][]).map(([t, items], i) => (
            <div key={t} className="rv rounded p-6" style={{ background: "rgba(11,11,11,0.28)", boxShadow: "inset 0 0 0 1px rgba(255,241,214,0.25)", ...d(2 + i) }}>
              <h3 className="tech text-[15px] font-bold uppercase tracking-[0.1em] text-gold-soft">{t}</h3>
              <ul className="mt-3 grid gap-2 text-[15px] text-white/85">{items.map((x) => <li key={x} className="border-t border-white/15 pt-2">{x}</li>)}</ul>
            </div>
          ))}
        </div>
        <div className="rv flex flex-wrap items-end justify-between gap-6" style={d(5)}>
          <p className="statement max-w-[20ch] text-white">A drone that pays for itself, one mu at a time.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/app/fleet" className="btn btn-gold">Watch a drone pay off its lease</Link>
            <Link href="/app/evidence" className="btn" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)" }}>Verify it yourself</Link>
          </div>
        </div>
      </Sec>
    </div>
  );
}
