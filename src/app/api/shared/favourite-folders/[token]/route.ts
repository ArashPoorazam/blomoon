import { requireUser } from "@/lib/auth/server";
import { getSharedFolderPreview, isFavouriteFolderShareOwner } from "@/lib/persistence/favouriteFolders";
import { withApiLogging } from "@/lib/server/logging/api";
import { favouriteShareTokenSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";
export const GET = withApiLogging("api.shared.favourite_folders.preview", async (_request: Request, { params }: { params: Promise<{ token: string }> }) => {
  const user = await requireUser(); const { token } = await params;
  if (!favouriteShareTokenSchema.safeParse(token).success) return Response.json({ error: "Shared folder is unavailable." }, { status: 404 });
  const [preview, isOwner] = await Promise.all([getSharedFolderPreview(token), isFavouriteFolderShareOwner(user.id, token)]);
  return preview ? Response.json({ isOwner, preview }, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Shared folder is unavailable." }, { status: 404 });
});
