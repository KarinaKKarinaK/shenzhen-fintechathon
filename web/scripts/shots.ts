// Screenshots for the README, taken with Playwright against a running build.
// Run: pnpm build && pnpm start -p 3111 (in another shell), then pnpm shots
// Writes docs/screenshots/*.png. BASE overrides the URL.

import { chromium, type Page } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3111";
const OUT = join(__dirname, "..", "..", "docs", "screenshots");
const DESKTOP = { width: 1440, height: 900 };

async function page(browser: Awaited<ReturnType<typeof chromium.launch>>, opts: { lang?: "en" | "zh"; theme?: "light" | "dark"; viewport?: { width: number; height: number }; mobile?: boolean }) {
  const ctx = await browser.newContext({ viewport: opts.viewport ?? DESKTOP, deviceScaleFactor: 2, isMobile: opts.mobile ?? false, hasTouch: opts.mobile ?? false, locale: opts.lang === "zh" ? "zh-CN" : "en-GB" });
  await ctx.addInitScript(([lang, theme]) => {
    try { localStorage.setItem("zishi-lang", lang); localStorage.setItem("zishi-theme", theme); } catch { /* private window */ }
  }, [opts.lang ?? "en", opts.theme ?? "light"]);
  const p = await ctx.newPage();
  return p;
}

async function settle(p: Page, ms = 1200) {
  await p.waitForLoadState("networkidle").catch(() => undefined);
  await p.waitForTimeout(ms);
}

async function shot(p: Page, name: string, fullPage = false) {
  await p.screenshot({ path: join(OUT, `${name}.png`), fullPage });
  console.log("wrote", name);
}

const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);
const want = (name: string) => !ONLY.length || ONLY.includes(name);

async function startRun(p: Page, lang: "en" | "zh", waitMs: number, feed = false) {
  const label = feed ? /start/i : lang === "zh" ? /开始|启动/ : /^Start$/;
  await p.getByRole("button", { name: label }).first().click();
  await p.waitForTimeout(waitMs);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  let p: Page;

  // Landing, light, English.
  if (want("landing")) {
  p = await page(browser, {});
  await p.goto(`${BASE}/`); await settle(p);
  await shot(p, "landing");
  await p.close();

  }
  // Landing, dark.
  if (want("landing-dark")) {
  p = await page(browser, { theme: "dark" });
  await p.goto(`${BASE}/`); await settle(p);
  await shot(p, "landing-dark");
  await p.close();

  }
  // Landing, Chinese.
  if (want("landing-zh")) {
  p = await page(browser, { lang: "zh" });
  await p.goto(`${BASE}/`); await settle(p);
  await shot(p, "landing-zh");
  await p.close();

  }
  // Dashboard before a run.
  if (want("dashboard")) {
  p = await page(browser, {});
  await p.goto(`${BASE}/app`); await settle(p);
  await shot(p, "dashboard");
  await p.close();

  }
  // The story, mid run, English and Chinese.
  if (want("demo")) {
  for (const lang of ["en", "zh"] as const) {
    p = await page(browser, { lang });
    await p.goto(`${BASE}/app/fleet`); await settle(p);
    await startRun(p, lang, 22_000);
    await shot(p, lang === "en" ? "demo" : "demo-zh");
    await p.close();
  }

  }
  // Live feed mode and Your data mode.
  if (want("live")) {
  p = await page(browser, {});
  await p.goto(`${BASE}/app/fleet?mode=feed`); await settle(p);
  await startRun(p, "en", 16_000, true);
  await shot(p, "live");
  await p.close();

  if (want("your-data")) {
    p = await page(browser, {});
    await p.goto(`${BASE}/app/fleet?mode=data`); await settle(p);
    await shot(p, "your-data");
    await p.close();
  }

  }
  // Evidence page: top, learned components, monitors.
  if (want("evidence")) {
  p = await page(browser, { viewport: { width: 1440, height: 1000 } });
  // One fast run first, so the monitors and the replay log have something to show.
  await p.request.get(`${BASE}/api/run?scenario=fleet&fast=1`, { timeout: 120_000 }).catch(() => undefined);
  await p.goto(`${BASE}/app/evidence`); await settle(p, 4000);
  await shot(p, "evidence");
  // Learned components and Monitors are <details> rows; open each, scroll to it, shoot the card.
  for (const [title, name] of [["Learned components", "learned-2"], ["Monitors", "monitors"]] as const) {
    const summary = p.locator("summary", { hasText: title }).first();
    if (!(await summary.count())) continue;
    const details = summary.locator("xpath=..");
    if (!(await details.evaluate((d) => (d as HTMLDetailsElement).open))) await summary.click();
    await p.waitForTimeout(2500);
    await details.scrollIntoViewIfNeeded();
    await p.waitForTimeout(600);
    await details.screenshot({ path: join(OUT, `${name}.png`) });
    console.log("wrote", name);
  }
  await p.close();

  }
  // Phone.
  if (want("phone")) {
  p = await page(browser, { viewport: { width: 390, height: 844 }, mobile: true });
  await p.goto(`${BASE}/`); await settle(p);
  await shot(p, "phone");
  await p.close();

  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
