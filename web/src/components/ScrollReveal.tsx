"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Mounted once in the layout. Sections, cards, bands and tiles fade and rise in as they scroll into
// view, siblings one after another, and any [data-count] number counts up from zero when it lands.
// Content added later (a tab switch, a new run) is picked up too. Nothing moves for anyone who asks
// for reduced motion, and anything inside [data-no-reveal] is left alone.
const SEL = "main section, main .card, main .band, main .tile, main [data-reveal]";

function countUp(root: HTMLElement) {
  const els = [root, ...root.querySelectorAll<HTMLElement>("[data-count]")].filter((x) => x.dataset.count !== undefined);
  for (const el of els) {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) continue;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 900);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))).toLocaleString("en-US");
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

export function ScrollReveal() {
  const path = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.classList.add("rv-in");
        io.unobserve(el);
        countUp(el);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });

    const scan = () => {
      document.querySelectorAll<HTMLElement>(SEL).forEach((el) => {
        if (seen.has(el) || el.closest("[data-no-reveal]")) return;
        seen.add(el);
        // Already scrolled past: show it as it is, no entrance.
        if (el.getBoundingClientRect().bottom < 0) return;
        const parent = el.parentElement;
        const index = parent ? [...parent.children].indexOf(el) : 0;
        el.style.transitionDelay = `${Math.min(Math.max(index, 0), 6) * 70}ms`;
        el.classList.add("rv");
        io.observe(el);
      });
    };

    let queued = 0;
    const mo = new MutationObserver(() => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; scan(); }); });
    scan();
    const main = document.querySelector("main");
    if (main) mo.observe(main, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); cancelAnimationFrame(queued); };
  }, [path]);
  return null;
}
