import { getRandomRadioPoint } from "@/lib/modes/radio";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";

export const GET = withApiLogging("api.modes.radio.points.random", async () => {
  const randomPoint = await getRandomRadioPoint();

  if (!randomPoint) {
    return Response.json({ error: "Station not found" }, { status: 404 });
  }

  return Response.json(randomPoint, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
});
