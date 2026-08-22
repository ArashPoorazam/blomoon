import { getRadioDetail } from "@/lib/modes/radio";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const detail = await getRadioDetail(id);

  if (!detail) {
    return Response.json({ error: "Station not found" }, { status: 404 });
  }

  return Response.json(detail, {
    headers: {
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600"
    }
  });
}
