import "server-only";
import { getDb, schema } from "@/db";
/** Only static route event identifiers and numeric HTTP status; no request payloads or URLs. */
export async function recordApiFailure(event: string, status: number) {
  if (!/^[a-zA-Z0-9_.-]{1,120}$/.test(event)) return;
  try {
    await getDb()
      .insert(schema.adminEvents)
      .values({ severity: "error", event, resource: `http:${status}` });
  } catch {
    /* Observability cannot mask the original failure. */
  }
}
