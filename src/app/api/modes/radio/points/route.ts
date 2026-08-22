import { getRadioDataset } from "@/lib/modes/radio";

export const dynamic = "force-dynamic";

export async function GET() {
  const dataset = await getRadioDataset();

  return Response.json(dataset, {
    headers: {
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600"
    }
  });
}
