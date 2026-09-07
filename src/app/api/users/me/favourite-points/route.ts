import { requireUser } from "@/lib/auth/server";
import { listFavouritePoints } from "@/lib/persistence/favouriteFolders";
import { withApiLogging } from "@/lib/server/logging/api";

export const dynamic = "force-dynamic";
export const GET = withApiLogging("api.users.me.favourite_points.list", async () => {
  const user = await requireUser();
  return Response.json(await listFavouritePoints(user.id), { headers: { "Cache-Control": "no-store" } });
});
