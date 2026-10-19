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

// One floating glass bar, the same on every page and in both themes. A thin line under it shows
// how far down the page you are.
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
    <header className="navbar fixed inset-x-3 top-3 z-50 md:inset-x-6">
      <div className="navbar-glass relative mx-auto flex h-14 max-w-[1200px] items-center gap-4 overflow-hidden rounded-2xl px-3 md:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={t("rail.homeAria")}>
          <Seal size={32} />
          <span className="hidden leading-tight sm:block">
            <span className="block font-bold text-ink">Zishi <span lang="zh-Hans" className="cjk-serif">自食</span></span>
            <span lang="zh-Hans" className="cjk-serif block text-[12px] text-ink-2">自食其力</span>
          </span>
        </Link>
        <nav className="ml-auto flex min-w-0 items-center gap-1 overflow-x-auto" aria-label={t("rail.sections")}>
          {items.map((it) => {
            const on = path === it.href;
            return (
              <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined}
                className={`relative whitespace-nowrap text-[14px] font-semibold transition-colors ${on ? "" : "text-ink-2 hover:text-ink"}`}>
                {t(it.label)}
              </Link>
            );
          })}
          <span className="mx-1.5 h-5 w-px bg-rule" aria-hidden />
          <LangToggle />
          <ThemeToggle />
        </nav>
        <span className="navbar-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden />
      </div>
    </header>
  );
}
