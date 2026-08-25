import { requireUser } from "@/lib/auth/server";
import { getModePersistenceAdapter } from "@/lib/persistence/registry";
import { apiError } from "@/lib/server/responses";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ modeId: string; pointId: string }> }
) {
  try {
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
  } catch (error) {
    return apiError(error);
  }
}
