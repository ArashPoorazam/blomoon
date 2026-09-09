import { requireUser } from "@/lib/auth/server";
import { addFavouriteFolderItem, FolderModeMismatchError } from "@/lib/persistence/favouriteFolders";
import { withApiLogging } from "@/lib/server/logging/api";
import { favouriteFolderIdSchema, favouriteFolderItemInputSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";
export const POST = withApiLogging("api.users.me.favourite_folders.items.add", async (request: Request, { params }: { params: Promise<{ folderId: string }> }) => {
  const user = await requireUser();
  const { folderId } = await params;
  const parsed = favouriteFolderItemInputSchema.safeParse(await readJson(request));
  if (!favouriteFolderIdSchema.safeParse(folderId).success || !parsed.success) return Response.json({ error: "Valid folder, mode, and point ids are required." }, { status: 400 });
  try {
  const membership = await addFavouriteFolderItem(user.id, folderId, parsed.data);
  return membership ? Response.json({ membership }, { status: 201, headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Folder or point not found." }, { status: 404 });
  } catch (error) {
    if (error instanceof FolderModeMismatchError) return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
});
async function readJson(request: Request) { try { return await request.json(); } catch { return null; } }
