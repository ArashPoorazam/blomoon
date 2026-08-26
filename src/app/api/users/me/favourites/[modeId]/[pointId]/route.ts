import { requireUser } from "@/lib/auth/server";
import { getModePersistenceAdapter } from "@/lib/persistence/registry";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";

export const DELETE = withApiLogging("api.users.me.favourites.remove", async (
  _request: Request,
  { params }: { params: Promise<{ modeId: string; pointId: string }> }
) => {
  const user = await requireUser();
  const { modeId, pointId } = await params;
  const adapter = getModePersistenceAdapter(modeId);

  if (!adapter) {
    return Response.json({ error: "Mode is not supported." }, { status: 404 });
  }

  const deleted = await adapter.removeFavourite(user.id, pointId);

  if (!deleted) {
    return Response.json({ error: "Favourite not found." }, { status: 404 });
  }

  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}, {
  context: async (_request, { params }) => {
    const { modeId, pointId } = await params;
    return { modeId, pointId };
  }
});
