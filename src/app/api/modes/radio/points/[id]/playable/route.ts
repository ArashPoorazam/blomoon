import { getRadioPlayableStream } from "@/lib/modes/radio";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const stream = await getRadioPlayableStream(id);

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
}
