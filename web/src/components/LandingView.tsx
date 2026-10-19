"use client";
import Link from "next/link";
import Image from "next/image";
import { Hero3D } from "./Hero3D";
import { Seal } from "./Seal";
import { Ticker } from "./Ticker";
import { Fan } from "./Fan";
import { RoundSeal } from "./RoundSeal";
import { JudgeConsole } from "./JudgeConsole";
import { useLang } from "@/i18n/LangProvider";

export type Limits = { payees: number; perTxCap: number; dailyCap: number; maxPerHour: number; deviationPct: number; bandLo: number; bandHi: number; floor: number };

export function LandingView({ attackN, benignN, limits }: { attackN: number; benignN: number; limits: Limits }) {
  const { d, t } = useLang();
  const L = d.landing;
  // The rules the policy engine checks per intent kind (engine/policy.ts), with the limits it uses as chips.
  const chips: (string | undefined)[][] = [
    [undefined, undefined, undefined],
    [undefined, t("landing.chips.payees", { n: limits.payees }), undefined],
    [t("landing.chips.yuan", { n: limits.perTxCap }), t("landing.chips.yuan", { n: limits.dailyCap }), t("landing.chips.perHour", { n: limits.maxPerHour }), t("landing.chips.percent", { n: limits.deviationPct }), t("landing.chips.band", { lo: limits.bandLo, hi: limits.bandHi })],
    [undefined, t("landing.chips.floor", { n: limits.floor }), undefined],
  ];
  const rules: [string, string][] = L.ruleGroups.flatMap((g, gi) => g.rules.map(([name, what], i) => { const c = chips[gi]?.[i]; return [name, c ? `${what} ${c}.` : what] as [string, string]; }));
  const pillars: [string, string][] = [
    [L.holds.human, `0 ${L.holds.humanLine}`],
    [L.holds.attacks, `${attackN} ${t("landing.holds.attacksLine", { n: benignN })}`],
    [L.holds.contracts, `3 ${L.holds.contractsLine}`],
    [L.holds.chain, L.holds.chainLine],
  ];
  const stats = [String(attackN), "3", "0", "2"];
  return (
    <div className="landing-root">
      <section className="duotone flex min-h-[100svh] items-end text-white">
        <Image src="/photos/shenzhen-tower.jpg" alt={L.heroAlt} fill priority sizes="100vw" className="object-cover object-[50%_35%]" />
        <div className="over pointer-events-none absolute -right-24 top-24 hidden opacity-20 lg:block" style={{ transform: "rotate(-8deg)" }}><Seal size={520} /></div>
        <div className="hero-fade" aria-hidden />
        <div className="over hero-content mx-auto w-full max-w-[1440px] px-4 pb-32 pt-28 md:px-8 md:pb-40">
          <div className="flex items-center gap-5">
            <Seal size={72} />
            <div>
              <div lang="zh-Hans" className="cjk-serif whitespace-nowrap text-[30px] leading-none md:text-[40px]">自食其力</div>
              <div className="mt-2 text-[15px] text-white/85">{L.tagline}</div>
            </div>
          </div>
          <h1 className="display mt-8 max-w-[15ch] text-[46px] font-extrabold text-white md:text-[80px]">{L.title}</h1>
          <span className="rule-gold mt-6" />
          <p className="mt-5 max-w-[46ch] text-lg text-white/90 md:text-xl">{L.sub}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/app/fleet" className="btn btn-red" style={{ boxShadow: "inset 0 0 0 1px rgba(201,162,39,0.8)" }}>{L.cta1}</Link>
            <Link href="/app/evidence" className="btn" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)" }}>{L.cta2}</Link>
          </div>
        </div>
        <a href="https://commons.wikimedia.org/wiki/File:China_Resources_Tower_View_from_Shenzhen_Bay_20210825.jpg" target="_blank" rel="noreferrer" className="over absolute bottom-[120px] right-4 text-[12px] text-white/70 hover:text-white">Photo: 歪歪, CC BY-SA 4.0, via Wikimedia Commons</a>
      </section>

      <Ticker />

      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="band mt-10 grid grid-cols-1 items-center gap-8 p-8 md:grid-cols-[auto_1fr_auto] md:p-10">
          <Seal size={84} />
          <div>
            <h2 className="text-[34px] font-extrabold">{L.zishiTitle}</h2>
            <p className="mt-1 max-w-[60ch] text-white/80">{L.zishiBody} <span lang="zh-Hans" className="cjk-serif">自食其力</span>{L.zishiIdiom}</p>
          </div>
          <Link href="/app" className="btn btn-red justify-self-start">{L.openMC}</Link>
        </section>

        <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {L.stats.map((l, i) => (
            <div key={l} className={`tile ${i === 0 ? "tile-seal" : ""}`}><dt className="sr-only">{l}</dt><dd className="kpi kpi-lg">{stats[i]}</dd><dd className="mt-1 text-[15px] text-ink-2">{l}</dd></div>
          ))}
        </dl>

        <section className="relative grid grid-cols-1 gap-10 overflow-hidden py-20 md:grid-cols-2">
          <RoundSeal size={380} opacity={0.12} rotate={-10} className="absolute -left-16 -top-10 z-0 hidden md:block" />
          <div className="relative">
            <span className="rule-gold" />
            <p className="statement mt-5">{L.statement1}</p>
            <p className="mt-4 max-w-[46ch] text-lg text-ink-2">{L.statement1Body}</p>
          </div>
          <div className="relative">
            <span className="rule-gold" />
            <p className="statement relative mt-5 text-seal">{L.statement2}</p>
            <p className="mt-4 max-w-[46ch] text-lg text-ink-2">{L.statement2Body}</p>
            <RoundSeal size={150} rotate={-12} className="absolute -bottom-20 right-2 z-0 hidden md:block" />
          </div>
        </section>

        <section className="band p-8 md:p-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><h2 className="h-section">{L.judgeTitle}</h2><span className="label">{L.judgeLabel}</span></div>
          <JudgeConsole compact />
        </section>

        <section className="py-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><span className="rule-gold mb-4" /><h2 className="h-section">{L.flowTitle}</h2><p className="mt-1 text-ink-2">{L.flowBody}</p></div>
            <Link href="/app/fleet" className="link">{L.flowLink}</Link>
          </div>
          <ol className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule md:grid-cols-4 xl:grid-cols-7">
            {L.steps.map(([st, b], i) => (
              <li key={st} className="bg-surface p-5"><div className="kpi text-gold-text">{i}</div><div className="mt-3 text-lg font-semibold">{st}</div><div className="mt-1 text-[15px] text-ink-2">{b}</div></li>
            ))}
          </ol>
        </section>

        <section className="band p-8 md:p-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="h-section">{L.usesTitle}</h2>
            <span className="label">{L.usesLabel}</span>
          </div>
          <div className="mt-6"><Fan items={L.uses} /></div>
        </section>

        <section className="relative grid grid-cols-1 gap-6 py-14 lg:grid-cols-[1.1fr_1fr]">
          <RoundSeal size={340} opacity={0.13} rotate={9} className="absolute -bottom-12 left-[22%] z-0 hidden lg:block" />
          <div className="relative">
            <span className="rule-gold mb-4" />
            <h2 className="h-section">{L.rulesTitle}</h2>
            <p className="mt-1 max-w-[52ch] text-ink-2">{L.rulesBody}</p>
            <Link href="/app/evidence" className="link mt-4 inline-block">{L.rulesLink}</Link>
          </div>
          <div className="card relative overflow-hidden">
            <table className="ledger">
              <thead><tr><th>{L.thRule}</th><th>{L.thEnforces}</th></tr></thead>
              <tbody>{rules.map(([r, dsc]) => <tr key={r}><td className="whitespace-nowrap font-semibold">{r}</td><td className="text-ink-2">{dsc}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="card p-6 md:p-8">
            <h2 className="text-[25px]">{L.safeTitle}</h2>
            <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {L.strengths.map(([ti, b]) => <li key={ti} className="tile"><div className="font-semibold">{ti}</div><div className="text-[15px] text-ink-2">{b}</div></li>)}
            </ul>
          </div>
          <div className="card p-6 md:p-8">
            <h2 className="text-[25px]">{L.whyTitle}</h2>
            <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {pillars.map(([n, h]) => <li key={n} className="tile tile-seal"><div className="font-semibold">{n}</div><div className="text-[15px] text-ink-2">{h}</div></li>)}
            </ul>
          </div>
        </section>

        <section className="band mt-6 p-8 md:p-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="h-section">{L.onlyTitle}</h2><span className="label">{L.onlyLabel}</span></div>
          <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            {L.firsts.map((f) => <li key={f} className="flex items-start gap-3 rounded-md bg-white/[0.07] px-4 py-3"><Seal size={18} />{f}</li>)}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/app" className="btn btn-red">{L.openMC}</Link>
            <a href="https://github.com/KarinaKKarinaK/shenzhen-fintechathon" target="_blank" rel="noreferrer" className="btn" style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}>{L.design}</a>
          </div>
        </section>

      </div>

      <section className="duotone duotone-soft mt-14 flex min-h-[90svh] items-end text-white">
        <Image src="/photos/drone-paddy.jpg" alt={L.paddyAlt} fill sizes="100vw" className="paddy-zoom object-cover" />
        <div className="over mx-auto w-full max-w-[1440px] px-4 pb-16 md:px-8 md:pb-20">
          <span className="rule-gold" />
          <p className="statement mt-5 max-w-[18ch] text-white">{L.paddyTitle}</p>
          <p className="mt-4 max-w-[46ch] text-lg text-white/90">{L.paddyBody}</p>
          <Link href="/app/fleet" className="btn btn-red mt-8" style={{ boxShadow: "inset 0 0 0 1px rgba(201,162,39,0.8)" }}>{L.paddyCta}</Link>
        </div>
        <a href="https://commons.wikimedia.org/wiki/File:Agricultural_drone_spraying_on_paddy_field.jpg" target="_blank" rel="noreferrer" className="over absolute bottom-3 right-4 text-[12px] text-white/70 hover:text-white">Photo: Shreesha Sharma, CC BY-SA 4.0, via Wikimedia Commons</a>
      </section>

      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="py-14">
          <span className="rule-gold mb-4" />
          <h2 className="h-section">{L.worldTitle}</h2>
          <p className="mt-1 text-ink-2">{L.worldBody}</p>
          <div className="card relative mt-6 h-[360px] overflow-hidden md:h-[520px]"><div className="absolute inset-0"><Hero3D /></div></div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-rule py-8 text-[15px] text-ink-2">
          <span className="flex items-center gap-3"><Seal size={28} /><span lang="zh-Hans" className="cjk-serif text-ink">自食其力</span>{L.footerIdiom}</span>
          <span>{L.footerEvent}</span>
        </footer>
      </div>
    </div>
  );
}
