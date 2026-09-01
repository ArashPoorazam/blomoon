import { removeFavouriteListItem } from "@/lib/persistence/favourites";
import { requireUser } from "@/lib/auth/server";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";

export const DELETE = withApiLogging("api.users.me.favourite_lists.items.remove", async (
  _request: Request,
  { params }: { params: Promise<{ listId: string; modeId: string; pointId: string }> }
) => {
  const user = await requireUser();
  const { listId, modeId, pointId } = await params;
  const deleted = await removeFavouriteListItem(user.id, listId, { modeId, pointId });

  if (!deleted) {
    return Response.json({ error: "Favourite not found." }, { status: 404 });
  }

  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}, {
  context: async (_request, { params }) => {
    const { listId, modeId, pointId } = await params;
    return { listId, modeId, pointId };
  }
});
