import { requireUser } from "@/lib/auth/server";
import { enableFavouriteFolderShare, revokeFavouriteFolderShare } from "@/lib/persistence/favouriteFolders";
import { withApiLogging } from "@/lib/server/logging/api";
import { favouriteFolderIdSchema, favouriteFolderShareInputSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ folderId: string }> };
export const POST = withApiLogging("api.users.me.favourite_folders.share.enable", async (request: Request, { params }: Context) => {
  const user = await requireUser(); const { folderId } = await params;
  if (!favouriteFolderIdSchema.safeParse(folderId).success) return Response.json({ error: "Invalid folder id." }, { status: 400 });
  let body: unknown;
  try { const text = await request.text(); body = text.trim() ? JSON.parse(text) : {}; }
  catch { return Response.json({ error: "Invalid share options." }, { status: 400 }); }
  const input = favouriteFolderShareInputSchema.safeParse(body);
  if (!input.success) return Response.json({ error: "Invalid share options." }, { status: 400 });
  const token = await enableFavouriteFolderShare(user.id, folderId, input.data.rotate);
  return token ? Response.json({ token }, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Folder not found." }, { status: 404 });
});
export const DELETE = withApiLogging("api.users.me.favourite_folders.share.revoke", async (_request: Request, { params }: Context) => {
  const user = await requireUser(); const { folderId } = await params;
  if (!favouriteFolderIdSchema.safeParse(folderId).success) return Response.json({ error: "Invalid folder id." }, { status: 400 });
  return await revokeFavouriteFolderShare(user.id, folderId) ? Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Folder not found." }, { status: 404 });
});
