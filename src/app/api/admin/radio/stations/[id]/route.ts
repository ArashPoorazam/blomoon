import { z } from "zod";
import { adminRequest } from "@/lib/modes/radio/adminHttp";
import { RadioAdminError, readAdminBody, saveCuratedStation } from "@/lib/modes/radio/admin";
export const PATCH = (request: Request, context: { params: Promise<{ id: string }> }) =>
  adminRequest(request, async (actor) => {
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw new RadioAdminError(400, "Invalid station ID.");
    return saveCuratedStation(actor, await readAdminBody(request), id);
  });
