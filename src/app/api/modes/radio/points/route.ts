import { after } from "next/server";
import { getRadioStartupDataset } from "@/lib/modes/radio";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";

export const GET = withApiLogging("api.modes.radio.points.list", async () => {
  const dataset = await getRadioStartupDataset({
    scheduleRefresh: (refresh) => after(refresh)
  });

  return Response.json(dataset, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=1800, stale-while-revalidate=3600"
    }
  });
});
