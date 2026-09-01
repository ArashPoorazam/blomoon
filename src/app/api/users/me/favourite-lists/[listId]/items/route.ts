import { addFavouriteListItem } from "@/lib/persistence/favourites";
import { requireUser } from "@/lib/auth/server";
import { withApiLogging } from "@/lib/server/logging/api";
import { favouriteListItemInputSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";

export const POST = withApiLogging("api.users.me.favourite_lists.items.add", async (
  request: Request,
  { params }: { params: Promise<{ listId: string }> }
) => {
  const user = await requireUser();
  const { listId } = await params;
  const parsed = favouriteListItemInputSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: "modeId and pointId are required." }, { status: 400 });
  }

  const favourite = await addFavouriteListItem(user.id, listId, parsed.data);

  if (!favourite) {
    return Response.json({ error: "List or point not found." }, { status: 404 });
  }

  return Response.json({ favourite }, {
    status: 201,
    headers: { "Cache-Control": "no-store" }
  });
}, {
  context: async (_request, { params }) => {
    const { listId } = await params;
    return { listId };
  }
});
