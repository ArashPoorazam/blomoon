import { getRadioDataset } from "@/lib/modes/radio/globeCatalog";
import { logger } from "@/lib/server/logging";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";

export const GET = withApiLogging("api.modes.radio.points.list", async () => {
  try {
    const dataset = await getRadioDataset();
    return Response.json(dataset, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logger.warn("radio.discovery.unavailable", { error, message: "Radio globe catalog unavailable" });
    return Response.json({ error: "The station catalog is temporarily unavailable. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "3" } });
  }
});
