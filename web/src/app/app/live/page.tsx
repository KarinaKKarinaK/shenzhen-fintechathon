import { redirect } from "next/navigation";

// The live feed and your-data runs are modes of the demo page now.
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  redirect(`/app/fleet?mode=${tab === "data" ? "data" : "feed"}`);
}
