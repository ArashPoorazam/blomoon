import { getRandomRadioPoint } from "@/lib/modes/radio";
import { isRadioStationId } from "@/lib/modes/radio/api";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";

export const GET = withApiLogging("api.modes.radio.points.random", async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const excludePointId = searchParams.get("excludePointId");

  if (excludePointId && !isRadioStationId(excludePointId)) {
    return Response.json({ error: "excludePointId is invalid." }, { status: 400 });
  }

  const randomPoint = await getRandomRadioPoint({ excludePointId });

  if (!randomPoint) {
    return Response.json({ error: "Station not found" }, { status: 404 });
  }

  return Response.json(randomPoint, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
});
