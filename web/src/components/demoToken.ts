// Real chain mode is gated by a demo token. It arrives once in the URL (?demo=TOKEN), is kept per browser,
// and is sent as a header with every run so the server anchors events on Base Sepolia.
export const DEMO_KEY = "zishi-demo-token";
export function demoHeaders(): Record<string, string> {
  try { const t = localStorage.getItem(DEMO_KEY); return t ? { "x-zishi-demo": t } : {}; } catch { return {}; }
}
export function captureDemoToken(): boolean {
  try {
    const u = new URL(window.location.href); const t = u.searchParams.get("demo");
    if (t) { localStorage.setItem(DEMO_KEY, t); u.searchParams.delete("demo"); window.history.replaceState({}, "", u.toString()); }
    return !!localStorage.getItem(DEMO_KEY);
  } catch { return false; }
}
