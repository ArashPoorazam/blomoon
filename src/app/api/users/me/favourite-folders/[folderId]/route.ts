import { requireUser } from "@/lib/auth/server";
import { deleteFavouriteFolder, getFavouriteFolder, updateFavouriteFolder } from "@/lib/persistence/favouriteFolders";
import { withApiLogging } from "@/lib/server/logging/api";
import { favouriteFolderIdSchema, favouriteFolderInputSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ folderId: string }> };

export const GET = withApiLogging("api.users.me.favourite_folders.get", async (_request: Request, { params }: Context) => {
  const user = await requireUser();
  const { folderId } = await params;
  if (!favouriteFolderIdSchema.safeParse(folderId).success) return Response.json({ error: "Invalid folder id." }, { status: 400 });
  const folder = await getFavouriteFolder(user.id, folderId);
  return folder ? Response.json({ folder }, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Folder not found." }, { status: 404 });
});

export const PATCH = withApiLogging("api.users.me.favourite_folders.update", async (request: Request, { params }: Context) => {
  const user = await requireUser();
  const { folderId } = await params;
  if (!favouriteFolderIdSchema.safeParse(folderId).success) return Response.json({ error: "Invalid folder id." }, { status: 400 });
  const parsed = favouriteFolderInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ error: "Enter a folder name and an optional description up to 240 characters." }, { status: 400 });
  try {
    const result = await updateFavouriteFolder(user.id, folderId, parsed.data);
    switch (result.kind) {
      case "not-found": return Response.json({ error: "Folder not found." }, { status: 404 });
      case "protected": return Response.json({ error: "The default Favourites folder cannot be renamed." }, { status: 409 });
      case "ok": return Response.json({ folder: result.folder }, { headers: { "Cache-Control": "no-store" } });
    }
  } catch {
    return Response.json({ error: "A folder with that name already exists." }, { status: 409 });
  }
});

export const DELETE = withApiLogging("api.users.me.favourite_folders.delete", async (_request: Request, { params }: Context) => {
  const user = await requireUser();
  const { folderId } = await params;
  if (!favouriteFolderIdSchema.safeParse(folderId).success) return Response.json({ error: "Invalid folder id." }, { status: 400 });
  const result = await deleteFavouriteFolder(user.id, folderId);
  if (result === "not-found") return Response.json({ error: "Folder not found." }, { status: 404 });
  if (result === "protected") return Response.json({ error: "The default Favourites folder cannot be deleted." }, { status: 409 });
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
});

async function readJson(request: Request) { try { return await request.json(); } catch { return null; } }
