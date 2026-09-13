import { getRadioStartupDataset } from "@/lib/modes/radio";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";

export const GET = withApiLogging("api.modes.radio.points.list", async () => {
  const dataset = await getRadioStartupDataset();

  return Response.json(dataset, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
});
