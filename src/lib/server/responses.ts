import { DatabaseNotConfiguredError, DatabaseRlsDisabledError, DatabaseSchemaMissingError } from "@/db/readiness";
import { AuthUnavailableError, UnauthorizedError } from "@/lib/auth/server";
import { logger } from "@/lib/server/logging";
import { ProviderPointLookupError } from "@/lib/persistence/points";

type ApiErrorContext = {
  requestId?: string;
  route?: string;
};

export function apiError(error: unknown, context: ApiErrorContext = {}) {
  if (error instanceof ProviderPointLookupError) {
    logger.warn("api.error", {
      context: { route: context.route, status: 502 },
      error,
      message: "Media provider point lookup failed",
      requestId: context.requestId
    });
    return Response.json({ error: "The media provider is unavailable right now." }, { status: 502 });
  }

  if (error instanceof UnauthorizedError) {
    logger.warn("api.error", {
      context: {
        route: context.route,
        status: 401
      },
      error,
      message: "API request was unauthorized",
      requestId: context.requestId
    });
    return Response.json({ error: "Authentication is required." }, { status: 401 });
  }

  if (error instanceof AuthUnavailableError) {
    logger.warn("api.error", {
      context: {
        route: context.route,
        status: 503
      },
      error,
      message: "Authentication is unavailable",
      requestId: context.requestId
    });
    return Response.json({ error: error.message }, { status: 503 });
  }

  if (error instanceof DatabaseNotConfiguredError) {
    logger.warn("api.error", {
      context: {
        route: context.route,
        status: 503
      },
      error,
      message: "Database is not configured",
      requestId: context.requestId
    });
    return Response.json({ error: error.message }, { status: 503 });
  }

  if (error instanceof DatabaseSchemaMissingError) {
    logger.error("api.error", {
      context: {
        missingTables: error.missingTables,
        route: context.route,
        status: 503
      },
      error,
      message: "Database schema is missing required tables",
      requestId: context.requestId
    });
    return Response.json({
      error: "Database schema is not initialized. Run npm run db:migrate.",
      missingTables: error.missingTables
    }, { status: 503 });
  }

  if (error instanceof DatabaseRlsDisabledError) {
    logger.error("api.error", {
      context: { route: context.route, status: 503, tableNames: error.tableNames },
      error,
      message: "Database row-level security is disabled",
      requestId: context.requestId
    });
    return Response.json({ error: "Database security is not initialized. Run npm run db:migrate." }, { status: 503 });
  }

  logger.error("api.error", {
    context: {
      route: context.route,
      status: 500
    },
    error,
    message: "API request failed",
    requestId: context.requestId
  });
  return Response.json({ error: "Request failed." }, { status: 500 });
}
