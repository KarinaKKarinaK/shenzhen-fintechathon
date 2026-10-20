// GET /api/keys: the actor key mode and the actor addresses. Public data only, never a key.
import { publicKeyInfo } from "@/engine/keys";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(publicKeyInfo(), { headers: { "Cache-Control": "no-store" } });
}
