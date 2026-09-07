import "server-only";

import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/server/responses";
import { logger } from "./index";
import { normalizeRequestId, type LogContext } from "./core";

type RouteHandler<Context> = (request: Request, context: Context) => Response | Promise<Response>;

export function withApiLogging<Context>(
  event: string,
  handler: RouteHandler<Context>,
  options: {
    context?: (request: Request, context: Context) => LogContext | Promise<LogContext>;
    noStore?: boolean;
  } = {}
) {
  return async function loggedRouteHandler(request: Request, context: Context) {
    const startedAt = performance.now();
    const requestId = getRequestId(request);
    const url = new URL(request.url);
    const baseContext: LogContext = {
      method: request.method,
      pathname: url.pathname
    };
    const extraContext = options.context ? await options.context(request, context) : {};

    logger.info("api.request.start", {
      context: {
        ...baseContext,
        ...extraContext
      },
      message: "API request started",
      requestId
    });

    try {
      const response = finalizeResponse(await handler(request, context), requestId, options.noStore);
      const level = response.status >= 500 ? "warn" : "info";
      logger[level]("api.request.complete", {
        context: {
          ...baseContext,
          ...extraContext,
          status: response.status
        },
        durationMs: elapsedMs(startedAt),
        message: "API request completed",
        requestId
      });
      return response;
    } catch (error) {
      const response = apiError(error, {
        requestId,
        route: event
      });
      const responseWithRequestId = finalizeResponse(response, requestId, options.noStore);
      logger.warn("api.request.failed", {
        context: {
          ...baseContext,
          ...extraContext,
          status: response.status
        },
        durationMs: elapsedMs(startedAt),
        message: "API request failed",
        requestId
      });
      return responseWithRequestId;
    }
  };
}

function finalizeResponse(response: Response, requestId: string, noStore = false) {
  const finalized = addRequestIdHeader(response, requestId);
  if (noStore) finalized.headers.set("Cache-Control", "no-store");
  return finalized;
}

function getRequestId(request: Request) {
  return normalizeRequestId(request.headers.get("x-request-id"), randomUUID());
}

function addRequestIdHeader(response: Response, requestId: string) {
  try {
    response.headers.set("x-request-id", requestId);
    return response;
  } catch {
    return new Response(response.body, {
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "x-request-id": requestId
      },
      status: response.status,
      statusText: response.statusText
    });
  }
}

function elapsedMs(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}
