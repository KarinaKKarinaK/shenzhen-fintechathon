"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Seal } from "./Logo";

const items = [
  { href: "/", label: "Home", icon: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" /> },
  { href: "/app", label: "Dashboard", icon: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></> },
  { href: "/app/fleet", label: "Live demo", icon: <><path d="M12 4v4M12 16v4M4 12h4M16 12h4" /><circle cx="12" cy="12" r="3" /></> },
  { href: "/app/evidence", label: "Evidence", icon: <><path d="M7 4h7l4 4v12H7z" /><path d="M14 4v4h4M9.5 13h5M9.5 16h5" /></> },
];

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);

export function Rail({ bar = false }: { bar?: boolean }) {
  const path = usePathname();
  if (bar) {
    // Phone: a bottom tab bar with words, the rail would take a quarter of the screen.
    return (
      <nav className="grid grid-cols-4" aria-label="Sections">
        {items.map((it) => {
          const on = path === it.href;
          return (
            <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[13px] ${on ? "font-semibold text-ink" : "text-ink-2"}`}>
              <Icon>{it.icon}</Icon>{it.label}
              <span className={`mt-0.5 h-0.5 w-6 rounded ${on ? "bg-ink" : "bg-transparent"}`} />
            </Link>
          );
        })}
      </nav>
    );
  }
  return (
    <nav className="rail flex h-full w-full flex-col items-center gap-1.5 py-4" aria-label="Sections">
      <Link href="/" className="seal-link mb-5" aria-label="Zishi home"><Seal size={40} /></Link>
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={path === it.href ? "page" : undefined} aria-label={it.label}>
          <Icon>{it.icon}</Icon>
          <span className="tip">{it.label}</span>
        </Link>
      ))}
      <div className="mt-auto flex flex-col items-center gap-3">
        <span lang="zh-Hans" className="cjk-serif text-[17px] text-ink" style={{ writingMode: "vertical-rl" }}>自食其力</span>
        <span className="h-6 w-px bg-gold" />
      </div>
    </nav>
  );
}
