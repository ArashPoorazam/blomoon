import { requireUser } from "@/lib/auth/server";
import { importSharedFavouriteFolder } from "@/lib/persistence/favouriteFolders";
import { withApiLogging } from "@/lib/server/logging/api";
import { favouriteShareTokenSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";
export const POST = withApiLogging("api.shared.favourite_folders.import", async (_request: Request, { params }: { params: Promise<{ token: string }> }) => {
  const user = await requireUser(); const { token } = await params;
  if (!favouriteShareTokenSchema.safeParse(token).success) return Response.json({ error: "Shared folder is unavailable." }, { status: 404 });
  const result = await importSharedFavouriteFolder(user.id, token);
  return result ? Response.json(result, { status: result.kind === "imported" ? 201 : 200, headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Shared folder is unavailable." }, { status: 404 });
});
