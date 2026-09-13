import "server-only";
import { logger } from "@/lib/server/logging";
import { assertAdminOrigin, RadioAdminError, requireRadioAdmin } from "./admin";
export async function adminRequest(
  request: Request,
  operation: (actorId: string) => Promise<unknown>,
  status = 200,
) {
  try {
    const user = await requireRadioAdmin();
    if (request.method !== "GET") assertAdminOrigin(request);
    return Response.json(await operation(user.id), { status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RadioAdminError)
      return Response.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    logger.error("radio.admin.failed", { error, message: "Radio administration request failed" });
    return Response.json(
      { error: "Radio administration is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
