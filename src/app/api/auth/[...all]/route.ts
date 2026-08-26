import { auth } from "@/lib/auth/server";
import { ensureDatabaseReady } from "@/db/readiness";
import { apiError } from "@/lib/server/responses";
import { toNextJsHandler } from "better-auth/next-js";

export const dynamic = "force-dynamic";

const handlers = toNextJsHandler(auth);

export async function GET(request: Request) {
  try {
    await ensureDatabaseReady();
    return handlers.GET(request);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseReady();
    return handlers.POST(request);
  } catch (error) {
    return apiError(error);
  }
}
