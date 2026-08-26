import { requireUser } from "@/lib/auth/server";
import { withApiLogging } from "@/lib/server/logging/api";
import { getViewer } from "@/lib/users/repository";

export const dynamic = "force-dynamic";

export const GET = withApiLogging("api.users.me.get", async () => {
  const user = await requireUser();
  const viewer = await getViewer(user);

  return Response.json({ user: viewer }, { headers: { "Cache-Control": "no-store" } });
});
