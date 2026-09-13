import "server-only";
import { logger } from "@/lib/server/logging";
import { ZodError } from "zod";
import { getOptionalUser } from "@/lib/auth/server";
import { AdminError, assertAdminOrigin, isAdmin } from "./access";
export async function requireAdmin() {
  const user = await getOptionalUser();
  if (!isAdmin(user))
    throw new AdminError(user ? 403 : 401, "Administrator access required.");
  return user!;
}
export async function adminRequest(
  request: Request,
  operation: (actorId: string) => Promise<unknown>,
  status = 200,
) {
  try {
    const user = await requireAdmin();
    if (request.method !== "GET") assertAdminOrigin(request);
    return Response.json(await operation(user.id), {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (!(error instanceof AdminError) && !(error instanceof ZodError))
      logger.error("admin.request.failed", {
        error,
        message: "Administration request failed",
      });
    return Response.json(
      {
        error:
          error instanceof AdminError
            ? error.message
            : error instanceof ZodError
              ? error.issues[0]?.message
              : "Administration is temporarily unavailable.",
      },
      {
        status:
          error instanceof AdminError
            ? error.status
            : error instanceof ZodError
              ? 400
              : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
export async function readAdminBody(
  request: Request,
  maxBytes = 32768,
): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AdminError(415, "JSON required.");
  const reader = request.body?.getReader();
  if (!reader) throw new AdminError(400, "Missing body.");
  let size = 0;
  const parts: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AdminError(413, "Request too large.");
      }
      parts.push(value);
    }
    try {
      return JSON.parse(Buffer.concat(parts).toString());
    } catch {
      throw new AdminError(400, "Invalid JSON.");
    }
  } finally {
    reader.releaseLock();
  }
}
