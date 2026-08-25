import { requireUser } from "@/lib/auth/server";
import { apiError } from "@/lib/server/responses";
import { getViewer } from "@/lib/users/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const viewer = await getViewer(user);

    return Response.json({ user: viewer }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
