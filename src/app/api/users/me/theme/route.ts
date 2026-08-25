import { requireUser } from "@/lib/auth/server";
import { apiError } from "@/lib/server/responses";
import { updateViewerTheme } from "@/lib/users/repository";
import { themeInputSchema } from "@/lib/users/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const parsed = themeInputSchema.safeParse(await request.json());

    if (!parsed.success) {
      return Response.json({ error: "themeId must be night or atlas." }, { status: 400 });
    }

    const selectedTheme = await updateViewerTheme(user.id, parsed.data.themeId);

    return Response.json({ selectedTheme }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
