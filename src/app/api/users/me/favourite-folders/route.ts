import { requireUser } from "@/lib/auth/server";
import { createFavouriteFolder, listFavouriteFolders } from "@/lib/persistence/favouriteFolders";
import { withApiLogging } from "@/lib/server/logging/api";
import { favouriteFolderInputSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";

export const GET = withApiLogging("api.users.me.favourite_folders.list", async () => {
  const user = await requireUser();
  return Response.json({ folders: await listFavouriteFolders(user.id) }, { headers: { "Cache-Control": "no-store" } });
});

export const POST = withApiLogging("api.users.me.favourite_folders.create", async (request: Request) => {
  const user = await requireUser();
  const parsed = favouriteFolderInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ error: "Enter a folder name and an optional description up to 240 characters." }, { status: 400 });
  try {
    const folder = await createFavouriteFolder(user.id, parsed.data.name, parsed.data.description);
    return Response.json({ folder }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "A folder with that name already exists." }, { status: 409 });
  }
});

async function readJson(request: Request) { try { return await request.json(); } catch { return null; } }
