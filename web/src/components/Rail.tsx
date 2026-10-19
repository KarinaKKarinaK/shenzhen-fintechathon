"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "./Logo";

const items = [
  { href: "/", label: "Home", icon: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" /> },
  { href: "/app", label: "Dashboard", icon: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></> },
  { href: "/app/neighbourhood", label: "Neighbourhood", icon: <><path d="M4 20V9l8-5 8 5v11" /><path d="M9 20v-6h6v6" /></> },
  { href: "/app/fleet", label: "Fleet", icon: <><path d="M12 4v4M12 16v4M4 12h4M16 12h4" /><circle cx="12" cy="12" r="3" /></> },
  { href: "/app/attack", label: "Attack lab", icon: <path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6zM9.5 12l1.8 1.8 3.4-3.6" /> },
  { href: "/app/evidence", label: "Evidence", icon: <><path d="M7 4h7l4 4v12H7z" /><path d="M14 4v4h4M9.5 13h5M9.5 16h5" /></> },
];

export function Rail() {
  const path = usePathname();
  return (
    <nav className="rail flex h-full w-full flex-col items-center gap-1.5 py-4" aria-label="Sections">
      <Link href="/" className="mb-5 !bg-transparent !shadow-none" aria-label="JiXin home" style={{ background: "transparent" }}><Mark size={34} /></Link>
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={path === it.href ? "page" : undefined} aria-label={it.label}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
          <span className="tip">{it.label}</span>
        </Link>
      ))}
      <div className="mt-auto text-center text-[10px] font-semibold leading-tight text-muted">机信</div>
    </nav>
  );
}
