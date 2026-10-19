"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LangToggle } from "@/i18n/LangToggle";
import { useLang, type TKey } from "@/i18n/LangProvider";

const items: { href: string; label: TKey; icon: React.ReactNode }[] = [
  { href: "/", label: "rail.home", icon: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" /> },
  { href: "/app", label: "rail.dashboard", icon: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></> },
  { href: "/app/fleet", label: "rail.fleet", icon: <><path d="M12 4v4M12 16v4M4 12h4M16 12h4" /><circle cx="12" cy="12" r="3" /></> },
  { href: "/app/evidence", label: "rail.evidence", icon: <><path d="M7 4h7l4 4v12H7z" /><path d="M14 4v4h4M9.5 13h5M9.5 16h5" /></> },
];

// Top bar: seal and name on the left, written links in the middle, language and theme on the right.
export function Rail() {
  const path = usePathname();
  const { t } = useLang();
  return (
    <nav className="topbar" aria-label={t("rail.sections")}>
      <Link href="/" className="brand" aria-label={t("rail.homeAria")}>
        <Mark size={32} />
        <span className="brand-text"><span className="font-bold text-ink">Zishi</span><span lang="zh-Hans" className="cjk-serif text-ink"> 自食其力</span></span>
      </Link>
      <div className="links">
        {items.map((it) => (
          <Link key={it.href} href={it.href} aria-current={path === it.href ? "page" : undefined}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{it.icon}</svg>
            <span>{t(it.label)}</span>
          </Link>
        ))}
      </div>
      <div className="tools"><LangToggle /><ThemeToggle /></div>
    </nav>
  );
}
