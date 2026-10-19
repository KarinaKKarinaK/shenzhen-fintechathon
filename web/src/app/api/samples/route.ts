import { SAMPLES } from "@/engine/samples";

export const dynamic = "force-static";

// The sample inputs a judge can run through POST /api/run-custom, served from /samples/<file>.
export function GET() {
  return Response.json({ samples: SAMPLES.map((s) => ({ ...s, url: `/samples/${s.file}` })) });
}
