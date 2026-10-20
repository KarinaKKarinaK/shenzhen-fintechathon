// In-memory rate limit for the public routes. One concurrent run per IP, ten per minute.

const minute = new Map<string, number[]>();
// ip -> start time. A slot expires after the longest a run can last, so a run killed by a timeout or a
// closed tab can never lock a visitor out.
const running = new Map<string, number>();
const RUN_MAX_MS = 330_000;

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
  const t = running.get(ip);
  if (t !== undefined && Date.now() - t < RUN_MAX_MS) return false;
  running.set(ip, Date.now());
  return true;
}

export function end(ip: string) { running.delete(ip); }

export const tooMany = () => new Response(JSON.stringify({ error: "too many requests" }), { status: 429, headers: { "Content-Type": "application/json" } });
