import { requireUser } from "@/lib/auth/server";
import { getModePersistenceAdapter, listFavouriteGroups } from "@/lib/persistence/registry";
import { withApiLogging } from "@/lib/server/logging/api";
import { favouriteInputSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";

export const GET = withApiLogging("api.users.me.favourites.list", async () => {
  const user = await requireUser();
  const groups = await listFavouriteGroups(user.id);

  return Response.json({ groups }, { headers: { "Cache-Control": "no-store" } });
});

export const POST = withApiLogging("api.users.me.favourites.add", async (request: Request) => {
  const user = await requireUser();
  const parsed = favouriteInputSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: "modeId and pointId are required." }, { status: 400 });
  }

  const adapter = getModePersistenceAdapter(parsed.data.modeId);

  if (!adapter) {
    return Response.json({ error: "Mode is not supported." }, { status: 404 });
  }

  const favourite = await adapter.addFavourite(user.id, parsed.data.pointId);

  if (!favourite) {
    return Response.json({ error: "Point not found." }, { status: 404 });
  }

  return Response.json({ favourite }, {
    status: 201,
    headers: { "Cache-Control": "no-store" }
  });
});
