// In-memory rate limit for the public routes. One concurrent run per IP, ten per minute.

const minute = new Map<string, number[]>();
const running = new Set<string>();

export function ipOf(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

export function allow(ip: string, perMinute = 10): boolean {
  const now = Date.now();
  const hits = (minute.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (hits.length >= perMinute) { minute.set(ip, hits); return false; }
  hits.push(now);
  minute.set(ip, hits);
  return true;
}

export function begin(ip: string): boolean {
  if (running.has(ip)) return false;
  running.add(ip);
  return true;
}

export function end(ip: string) { running.delete(ip); }

export const tooMany = () => new Response(JSON.stringify({ error: "too many requests" }), { status: 429, headers: { "Content-Type": "application/json" } });
