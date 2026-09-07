import { requireUser } from "@/lib/auth/server";
import { removeFavouriteFolderItem } from "@/lib/persistence/favouriteFolders";
import { withApiLogging } from "@/lib/server/logging/api";
import { favouriteFolderIdSchema, favouriteFolderItemInputSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";
export const DELETE = withApiLogging("api.users.me.favourite_folders.items.remove", async (_request: Request, { params }: { params: Promise<{ folderId: string; modeId: string; pointId: string }> }) => {
  const user = await requireUser();
  const { folderId, modeId, pointId } = await params;
  if (!favouriteFolderIdSchema.safeParse(folderId).success || !favouriteFolderItemInputSchema.safeParse({ modeId, pointId }).success) return Response.json({ error: "Invalid favourite reference." }, { status: 400 });
  return await removeFavouriteFolderItem(user.id, folderId, { modeId, pointId })
    ? Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
    : Response.json({ error: "Favourite not found." }, { status: 404 });
});
