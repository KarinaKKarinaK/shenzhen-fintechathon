"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Seal } from "./Seal";
import { ThemeToggle } from "./ThemeToggle";
import { LangToggle } from "@/i18n/LangToggle";
import { useLang, type TKey } from "@/i18n/LangProvider";

const items: { href: string; label: TKey }[] = [
  { href: "/", label: "rail.home" },
  { href: "/app", label: "rail.dashboard" },
  { href: "/app/fleet", label: "rail.fleet" },
  { href: "/app/evidence", label: "rail.evidence" },
];

// One top bar, the same on every page and in both themes: dark glass, the logo left, the sections
// in the middle, the toggles right, and a thin line along its bottom edge for how far down you are.
export function Rail() {
  const path = usePathname();
  const { t } = useLang();
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const raf = requestAnimationFrame(on);
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, [path]);
  return (
    <header className="navbar fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-4 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={t("rail.homeAria")}>
          <Seal size={34} />
          <span className="navbar-brand hidden leading-tight sm:block">
            <span className="block text-[17px] font-semibold tracking-tight">Zishi <span lang="zh-Hans" className="cjk-serif">自食</span></span>
            <span lang="zh-Hans" className="cjk-serif block text-[12px] text-ink-2">自食其力</span>
          </span>
        </Link>
        <nav className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto px-2" aria-label={t("rail.sections")}>
          {items.map((it) => {
            const on = path === it.href;
            return <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined} className="navlink whitespace-nowrap">{t(it.label)}</Link>;
          })}
        </nav>
        <div className="navbar-right flex shrink-0 items-center gap-1.5">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
      <span className="navbar-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden />
    </header>
  );
}
