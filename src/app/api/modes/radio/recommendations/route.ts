import { getOptionalUser } from "@/lib/auth/server";
import { parseIntegerParam } from "@/lib/modes/radio/api";
import { getRadioRecommendations, RecommendationPageExpired } from "@/lib/modes/radio/recommendations";
import { withApiLogging } from "@/lib/server/logging/api";
import { logger } from "@/lib/server/logging";
import { z } from "zod";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export const GET = withApiLogging("api.modes.radio.recommendations", async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const limit = parseIntegerParam(params, "limit", { defaultValue: 50, min: 1, max: 100 });
  const offset = parseIntegerParam(params, "offset", { defaultValue: 0, min: 0, max: 500 });
  const pageToken = params.get("pageToken") ?? undefined;
  if (limit.error || offset.error || (pageToken !== undefined && !z.uuid().safeParse(pageToken).success)
    || (offset.value > 0 && !pageToken)) {
    return Response.json({ error: limit.error ?? offset.error ?? "Provide a valid pageToken for pagination." }, { status: 400, headers });
  }
  try {
    const user = await getOptionalUser();
    return Response.json(await getRadioRecommendations(user?.id ?? null, limit.value, offset.value, pageToken), { headers });
  } catch (error) {
    if (error instanceof RecommendationPageExpired) {
      return Response.json({ error: "Suggestions expired. Refresh suggestions to continue." }, { status: 409, headers });
    }
    logger.warn("radio.recommendations.unavailable", { error, message: "Recommendations are unavailable" });
    return Response.json({ error: "Suggestions are unavailable. Please retry." }, { status: 503, headers });
  }
});
