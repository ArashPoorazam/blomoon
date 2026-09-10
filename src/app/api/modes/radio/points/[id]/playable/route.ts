import { getRadioPlayableStream } from "@/lib/modes/radio";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";

export const POST = withApiLogging("api.modes.radio.points.playable", async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id)) return Response.json({ error: "Invalid station ID" }, { status: 400 });
  const refreshValues = new URL(request.url).searchParams.getAll("refresh");
  if (refreshValues.length > 1 || (refreshValues.length === 1 && refreshValues[0] !== "true")) {
    return Response.json({ error: "refresh must be true when provided" }, { status: 400 });
  }

  try {
    const stream = await getRadioPlayableStream(id, refreshValues.length === 1);

    if (!stream) {
      return Response.json({ error: "Station not found" }, { status: 404 });
    }

    return Response.json(stream, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return Response.json({ error: "Station stream is not playable right now." }, { status: 502 });
  }
}, {
  context: async (_request, { params }) => {
    const { id } = await params;
    return { pointId: id };
  }
});
