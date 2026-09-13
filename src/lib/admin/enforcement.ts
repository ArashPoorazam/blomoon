import "server-only";
import { getOptionalUser } from "@/lib/auth/server";
import { getModeSettings, getSettings } from "./settings";
import { isAdmin } from "./access";
export async function publicRestriction(
  request: Request,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (
    !path.startsWith("/api/") ||
    path.startsWith("/api/auth/") ||
    path.startsWith("/api/omnisire/") ||
    ["/api/health", "/api/ready", "/api/application-state"].includes(path)
  )
    return null;
  const settings = await getSettings();
  if (settings.maintenance && !isAdmin(await getOptionalUser()))
    return Response.json(
      { error: settings.maintenanceMessage, code: "maintenance" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store", "Retry-After": "60" },
      },
    );
  const match = /^\/api\/modes\/([^/]+)(?:\/|$)/.exec(path);
  if (match && !(await getModeSettings(match[1])).enabled)
    return Response.json(
      { error: "This media mode is disabled.", code: "mode_disabled" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  return null;
}
