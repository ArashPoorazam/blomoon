import { auth } from "@/lib/auth/server";
import { ensureDatabaseReady } from "@/db/readiness";
import { withApiLogging } from "@/lib/server/logging/api";
import { toNextJsHandler } from "better-auth/next-js";

export const dynamic = "force-dynamic";

const handlers = toNextJsHandler(auth);

export const GET = withApiLogging("api.auth.get", async (request: Request) => {
  await ensureDatabaseReady();
  return handlers.GET(request);
});

export const POST = withApiLogging("api.auth.post", async (request: Request) => {
  await ensureDatabaseReady();
  return handlers.POST(request);
});
