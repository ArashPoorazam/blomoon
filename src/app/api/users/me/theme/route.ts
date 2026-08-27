import { requireUser } from "@/lib/auth/server";
import { withApiLogging } from "@/lib/server/logging/api";
import { terraThemeIdList } from "@/lib/theme/ids";
import { updateViewerTheme } from "@/lib/users/repository";
import { themeInputSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";

export const PATCH = withApiLogging("api.users.me.theme.update", async (request: Request) => {
  const user = await requireUser();
  const parsed = themeInputSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: `themeId must be one of: ${terraThemeIdList}.` }, { status: 400 });
  }

  const selectedTheme = await updateViewerTheme(user.id, parsed.data.themeId);

  return Response.json({ selectedTheme }, { headers: { "Cache-Control": "no-store" } });
});
