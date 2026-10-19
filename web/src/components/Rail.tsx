"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/app", label: "Overview", icon: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" /> },
  { href: "/app/neighbourhood", label: "Neighbourhood", icon: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M12 5v14M4 12h16" /></> },
  { href: "/app/fleet", label: "Fleet", icon: <><path d="M12 4v4M12 16v4M4 12h4M16 12h4" /><circle cx="12" cy="12" r="3" /></> },
  { href: "/app/attack", label: "Attack lab", icon: <path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6zM9.5 12l1.8 1.8 3.4-3.6" /> },
  { href: "/app/evidence", label: "Evidence", icon: <><path d="M7 4h7l4 4v12H7z" /><path d="M14 4v4h4M9.5 13h5M9.5 16h5" /></> },
];

export function Rail() {
  const path = usePathname();
  return (
    <nav className="rail flex h-full flex-col items-center gap-1 py-5" aria-label="Sections">
      <Link href="/" className="mb-6" aria-label="Home">
        <svg width="34" height="34" viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="9" fill="#14302d" /><path d="M9 20.5c1.6 2 4 3 7 3 3.8 0 6-1.7 6-4.2 0-2.6-2.2-3.5-5.7-4.2C13.2 14.5 11 13.6 11 11.4 11 9.2 13 8 16.2 8c2.6 0 4.6.9 6 2.6" stroke="#63dcd2" strokeWidth="2.4" strokeLinecap="round" /></svg>
      </Link>
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={path === it.href ? "page" : undefined} title={it.label} aria-label={it.label}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
        </Link>
      ))}
      <div className="mt-auto text-center text-[10px] leading-tight text-muted">Topic F<br />FinTechathon</div>
    </nav>
  );
}
