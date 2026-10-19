"use client";
import Link from "next/link";
import { useEffect } from "react";
import Image from "next/image";
import { Seal } from "./Seal";
import { useLang } from "@/i18n/LangProvider";

export function LandingView({ attackN }: { attackN: number }) {
  const { d, t } = useLang();
  const L = d.landing;
  const stats = [attackN, 4, 2, 0];
  // Marks the page so globals.css can drop main's padding (the build drops html:has rules).
  useEffect(() => {
    document.documentElement.classList.add("on-landing");
    return () => document.documentElement.classList.remove("on-landing");
  }, []);
  return (
    <div className="landing-root">
      <section data-no-reveal className="duotone flex min-h-[100svh] items-end text-white">
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

      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="py-20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><span className="rule-gold mb-4" /><h2 className="h-section">{L.howTitle}</h2></div>
            <Link href="/app/fleet" className="link">{L.howLink}</Link>
          </div>
          <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {L.how.map(([title, body], i) => (
              <li key={title} className="card p-6 md:p-8"><div className="kpi text-gold-text">{i + 1}</div><h3 className="mt-3 text-[22px] font-semibold">{title}</h3><p className="mt-2 text-ink-2">{body}</p></li>
            ))}
          </ol>
          <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {L.stats.map(([label, note], i) => (
              <div key={label} className="tile p-5"><dt className="sr-only">{label}</dt><dd className="kpi kpi-lg" data-count={stats[i]}>{stats[i]}</dd><dd className="mt-1 font-medium text-ink">{label}</dd><dd className="text-sm text-muted">{note}</dd></div>
            ))}
          </dl>
        </section>

        <section className="pb-20">
          <span className="rule-gold mb-4" /><h2 className="h-section">{L.castTitle}</h2>
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {L.cast.map(([who, what]) => <li key={who} className="card p-5"><h3 className="text-lg font-semibold">{who}</h3><p className="mt-1.5 text-sm text-ink-2">{what}</p></li>)}
          </ul>
        </section>

        <section className="pb-20">
          <span className="rule-gold mb-4" /><h2 className="h-section">{L.bondsTitle}</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {L.bonds.map(([name, ...cells], bi) => (
              <div key={name} className={`card p-6 ${bi === 0 ? "border-l-4 border-l-gold" : "border-l-4 border-l-seal"}`}>
                <h3 className="text-xl font-semibold">{name}</h3>
                <dl className="mt-4 grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-3 text-sm">
                  {cells.map((v, i) => <div key={i} className="contents"><dt className="text-muted">{L.bondsRows[i]}</dt><dd className="text-ink">{v}</dd></div>)}
                </dl>
              </div>
            ))}
          </div>
        </section>

        <section className="band mb-20 p-8 md:p-10">
          <p className="statement max-w-[24ch]">{L.proofTitle}</p>
          <p className="mt-4 max-w-[60ch] text-lg text-white/85">{t("landing.proofBody", { n: attackN })}</p>
          <Link href="/app/evidence" className="link mt-6 inline-block">{L.proofLink}</Link>
        </section>

        <section className="pb-20">
          <span className="rule-gold mb-4" /><h2 className="h-section">{L.tryTitle}</h2>
          <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {L.tries.map(([title, body, href]) => (
              <li key={href}><Link href={href} className="card group flex h-full flex-col p-6 transition-colors hover:border-gold"><span className="text-lg font-semibold">{title} <span className="inline-block transition-transform group-hover:translate-x-1">&rarr;</span></span><span className="mt-1.5 text-sm text-ink-2">{body}</span></Link></li>
            ))}
          </ul>
        </section>
      </div>

      <section className="duotone duotone-soft flex min-h-[90svh] items-end text-white">
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
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-rule py-8 text-[15px] text-ink-2">
          <span className="flex items-center gap-3"><Seal size={28} /><span lang="zh-Hans" className="cjk-serif text-ink">自食其力</span>{L.footerIdiom}</span>
          <span>{L.footerEvent}</span>
        </footer>
      </div>
    </div>
  );
}
