import { DatabaseNotConfiguredError, DatabaseSchemaMissingError } from "@/db/readiness";
import { AuthUnavailableError, UnauthorizedError } from "@/lib/auth/server";

export function apiError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: "Authentication is required." }, { status: 401 });
  }

  if (error instanceof AuthUnavailableError) {
    return Response.json({ error: error.message }, { status: 503 });
  }

  if (error instanceof DatabaseNotConfiguredError) {
    return Response.json({ error: error.message }, { status: 503 });
  }

  if (error instanceof DatabaseSchemaMissingError) {
    return Response.json({
      error: "Database schema is not initialized. Run npm run db:migrate.",
      missingTables: error.missingTables
    }, { status: 503 });
  }

  return Response.json({ error: "Request failed." }, { status: 500 });
}
