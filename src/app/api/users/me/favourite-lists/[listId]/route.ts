import { deleteFavouriteList, renameFavouriteList } from "@/lib/persistence/favourites";
import { requireUser } from "@/lib/auth/server";
import { withApiLogging } from "@/lib/server/logging/api";
import { favouriteListInputSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";

export const PATCH = withApiLogging("api.users.me.favourite_lists.rename", async (
  request: Request,
  { params }: { params: Promise<{ listId: string }> }
) => {
  const user = await requireUser();
  const { listId } = await params;
  const parsed = favouriteListInputSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: "List name is required." }, { status: 400 });
  }

  try {
    const list = await renameFavouriteList(user.id, listId, parsed.data.name);

    if (!list) {
      return Response.json({ error: "List not found." }, { status: 404 });
    }

    return Response.json({ list }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "A list with that name already exists." }, { status: 409 });
  }
}, {
  context: async (_request, { params }) => {
    const { listId } = await params;
    return { listId };
  }
});

export const DELETE = withApiLogging("api.users.me.favourite_lists.delete", async (
  _request: Request,
  { params }: { params: Promise<{ listId: string }> }
) => {
  const user = await requireUser();
  const { listId } = await params;
  const deleted = await deleteFavouriteList(user.id, listId);

  if (!deleted) {
    return Response.json({ error: "List not found." }, { status: 404 });
  }

  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}, {
  context: async (_request, { params }) => {
    const { listId } = await params;
    return { listId };
  }
});
