"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Seal } from "./Logo";

const items = [
  { href: "/", label: "Home" },
  { href: "/app", label: "Dashboard" },
  { href: "/app/fleet", label: "Live demo" },
  { href: "/app/evidence", label: "Evidence" },
];

// Top bar with written links. Over the landing photo it starts transparent and turns solid on scroll.
export function Rail() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    const raf = requestAnimationFrame(on);
    window.addEventListener("scroll", on, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); };
  }, []);
  const overPhoto = path === "/" && !scrolled;
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${overPhoto ? "bg-transparent text-white" : "border-b border-rule bg-surface text-ink"}`}>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-4 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Zishi home">
          <Seal size={36} />
          <span className="hidden leading-tight sm:block">
            <span className="block font-bold">Zishi <span lang="zh-Hans" className="cjk-serif">自食</span></span>
            <span lang="zh-Hans" className={`cjk-serif block text-[13px] ${overPhoto ? "text-white/80" : "text-ink-2"}`}>自食其力</span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 overflow-x-auto" aria-label="Sections">
          {items.map((it) => {
            const on = path === it.href;
            return (
              <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined}
                className={`relative whitespace-nowrap rounded-md px-3 py-2 text-[15px] font-semibold transition-colors ${on ? "" : overPhoto ? "text-white/80 hover:text-white" : "text-ink-2 hover:text-ink"}`}>
                {it.label}
                <span className={`absolute inset-x-3 -bottom-0.5 h-0.5 rounded ${on ? (overPhoto ? "bg-white" : "bg-seal") : "bg-transparent"}`} />
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
