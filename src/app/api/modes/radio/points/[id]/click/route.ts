import { requireUser } from "@/lib/auth/server";
import { getModePersistenceAdapter } from "@/lib/persistence/registry";
import { apiError } from "@/lib/server/responses";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const adapter = getModePersistenceAdapter("radio");
    const result = await adapter?.recordClick(user.id, id);

    if (!result) {
      return Response.json({ error: "Station not found." }, { status: 404 });
    }

    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
