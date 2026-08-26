import { getRadioDetail } from "@/lib/modes/radio";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";

export const GET = withApiLogging("api.modes.radio.points.detail", async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
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
}, {
  context: async (_request, { params }) => {
    const { id } = await params;
    return { pointId: id };
  }
});
