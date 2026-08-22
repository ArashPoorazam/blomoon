import { getEarthquakeDetail } from "@/lib/modes/earthquakes";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const detail = await getEarthquakeDetail(id);

  if (!detail) {
    return Response.json({ error: "Point not found" }, { status: 404 });
  }

  return Response.json(detail, {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800"
    }
  });
}
