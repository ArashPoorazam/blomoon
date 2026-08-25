import { requireUser } from "@/lib/auth/server";
import { getModePersistenceAdapter, listFavouriteGroups } from "@/lib/persistence/registry";
import { apiError } from "@/lib/server/responses";
import { favouriteInputSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const groups = await listFavouriteGroups(user.id);

    return Response.json({ groups }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    return apiError(error);
  }
}
