"use client";
import { useEffect, useState } from "react";

// Light by default, dark on request, remembered per browser. The html data-theme attribute drives the tokens.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDark(document.documentElement.getAttribute("data-theme") === "dark"); }, []);
  function toggle() {
    const next = !dark; setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try { localStorage.setItem("jixin-theme", next ? "dark" : "light"); } catch {}
  }
  return (
    <button type="button" onClick={toggle} aria-pressed={dark} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Light theme" : "Dark theme"} className="grid h-10 w-10 place-items-center rounded-[4px] text-ink-2 transition hover:bg-gold-soft hover:text-ink">
      {dark ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z" /></svg>}
    </button>
  );
}
