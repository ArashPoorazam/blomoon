import { after } from "next/server";
import { getRadioPlayableStream, RadioResolutionError, recordRadioPlaybackClick } from "@/lib/modes/radio/playback";
import { logger } from "@/lib/server/logging";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";
const errors = {
  invalid_input: { status: 400, error: "Invalid playback request." },
  not_found: { status: 404, error: "This station is no longer available." },
  provider_failure: { status: 502, error: "The station directory is unavailable. Try again." },
  resolution_timeout: { status: 503, error: "Station lookup took too long. Try again." },
  no_source: { status: 409, error: "This station has no eligible stream address." }
};
function failure(code: keyof typeof errors) {
  const { status, error } = errors[code];
  return Response.json({ code, error }, { status, headers: { "Cache-Control": "no-store" } });
}
export const POST = withApiLogging("api.modes.radio.points.playable", async (
  request: Request, { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const refreshValues = new URL(request.url).searchParams.getAll("refresh");
  if (refreshValues.length > 1 || (refreshValues.length === 1 && refreshValues[0] !== "true")) return failure("invalid_input");
  try {
    const { stream, providerId } = await getRadioPlayableStream(id, refreshValues.length === 1, request.signal);
    if (providerId) after(() => recordRadioPlaybackClick(providerId));
    return Response.json(stream, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    if (error instanceof RadioResolutionError) {
      logger.warn("radio.playback.resolution_failed", { context: { pointId: id, code: error.code }, message: "Radio resolution failed" });
      return failure(error.code);
    }
    logger.error("radio.playback.internal_error", { context: { pointId: id }, error, message: "Unexpected playback resolution failure" });
    return Response.json({ code: "internal_error", error: "Playback is temporarily unavailable." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}, { context: async (_request, { params }) => ({ pointId: (await params).id }) });
