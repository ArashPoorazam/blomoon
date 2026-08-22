import { getEarthquakeDataset } from "@/lib/modes/earthquakes";

export async function GET() {
  const dataset = await getEarthquakeDataset();

  return Response.json(dataset, {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800"
    }
  });
}
