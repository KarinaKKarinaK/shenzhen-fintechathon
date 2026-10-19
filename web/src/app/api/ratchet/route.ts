import { cached } from "@/engine/ratchet";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const steps = Number(url.searchParams.get("steps") ?? 60);
  return Response.json({ ...cached(steps), ranAt: new Date().toISOString(), note: "frozen eval: a week of offers from a fixed seed, the reserve rule as a hard constraint; the strategy cannot touch the eval" });
}
