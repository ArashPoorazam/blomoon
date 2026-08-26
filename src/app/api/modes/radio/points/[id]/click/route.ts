import { requireUser } from "@/lib/auth/server";
import { getModePersistenceAdapter } from "@/lib/persistence/registry";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";

export const POST = withApiLogging("api.modes.radio.points.click", async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const { id } = await params;
  const adapter = getModePersistenceAdapter("radio");
  const result = await adapter?.recordClick(user.id, id);

  if (!result) {
    return Response.json({ error: "Station not found." }, { status: 404 });
  }

  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}, {
  context: async (_request, { params }) => {
    const { id } = await params;
    return { pointId: id };
  }
});
