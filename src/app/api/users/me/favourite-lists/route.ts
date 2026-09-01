import { createFavouriteList, listFavouriteLists } from "@/lib/persistence/favourites";
import { requireUser } from "@/lib/auth/server";
import { withApiLogging } from "@/lib/server/logging/api";
import { favouriteListInputSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";

export const GET = withApiLogging("api.users.me.favourite_lists.list", async () => {
  const user = await requireUser();
  const lists = await listFavouriteLists(user.id);

  return Response.json({ lists }, { headers: { "Cache-Control": "no-store" } });
});

export const POST = withApiLogging("api.users.me.favourite_lists.create", async (request: Request) => {
  const user = await requireUser();
  const parsed = favouriteListInputSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: "List name is required." }, { status: 400 });
  }

  try {
    const list = await createFavouriteList(user.id, parsed.data.name);

    return Response.json({ list }, {
      status: 201,
      headers: { "Cache-Control": "no-store" }
    });
  } catch {
    return Response.json({ error: "A list with that name already exists." }, { status: 409 });
  }
});
