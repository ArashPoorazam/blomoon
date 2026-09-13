import "server-only";
import { and, eq, gte, inArray } from "drizzle-orm";
import { setTimeout } from "node:timers/promises";
import { getDb, schema } from "@/db";
import { AdminError } from "@/lib/admin/access";
import { runNextJob } from "@/lib/admin/jobs";
import { requestStationRecheck } from "./sources";
export async function runRecheckJob() {
  return runNextJob("radio", "recheck", async (id) => {
    const started = new Date();
    const queued = await requestStationRecheck(id);
    if (!queued)
      throw new AdminError(
        429,
        "Station is blocked, has no enabled sources, or was checked too recently.",
      );
    const sources = await getDb()
      .select({ id: schema.radioStreamSources.id })
      .from(schema.radioStreamSources)
      .where(
        and(
          eq(schema.radioStreamSources.stationId, id),
          gte(schema.radioStreamSources.lastRequested, started),
        ),
      );
    if (!sources.length) throw new Error("Requested sources unavailable");
    const deadline = Date.now() + 5 * 60000;
    while (Date.now() < deadline) {
      const current = await getDb()
        .select()
        .from(schema.radioStreamSources)
        .where(
          inArray(
            schema.radioStreamSources.id,
            sources.map((s) => s.id),
          ),
        );
      const finished = current.filter(
        (s) => s.lastAttempt && s.lastAttempt >= started,
      );
      if (finished.length === sources.length)
        return `${finished.length} checks completed; ${finished.filter((s) => s.failures === 0).length} healthy, ${finished.filter((s) => s.failures > 0).length} failed.`;
      await setTimeout(2000);
    }
    throw new Error("Checks did not finish within five minutes");
  });
}
