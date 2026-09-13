import "server-only";
import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { RadioTransaction } from "../identityStore";
import { radioPlaybackSources } from "../playbackSources";
import type { RadioStationRecord } from "../types";

export function sourceInput(
  stationId: string,
  streamUrl: string,
  origin: "provider" | "curated",
  providerId: string | null = null,
) {
  return {
    stationId,
    streamUrl,
    origin,
    providerId,
    host: new URL(streamUrl).hostname,
    sourceKey: createHash("sha256")
      .update(JSON.stringify([origin, providerId ?? stationId, streamUrl]))
      .digest("hex"),
  };
}

/** Called inside catalog publication; metadata refreshes never overwrite health. */
export async function publishProviderSources(tx: RadioTransaction, records: RadioStationRecord[]) {
  const aliases = await tx
    .select({
      stationId: schema.radioStationAliases.stationId,
      canonicalId: schema.radioStationAliases.canonicalId,
    })
    .from(schema.radioStationAliases);
  const ids = new Map(aliases.map((a) => [a.stationId, a.canonicalId]));
  await tx
    .update(schema.radioStreamSources)
    .set({ enabled: false })
    .where(eq(schema.radioStreamSources.origin, "provider"));
  const values = records.flatMap((record) =>
    radioPlaybackSources({
      stationuuid: record.point.id,
      url: record.providerStreamUrls?.[0] ?? record.streamUrl,
      url_resolved: record.providerStreamUrls?.[1],
    })
      .sources.filter((source) => source.format === "audio")
      .map((source) =>
        sourceInput(
          ids.get(record.point.id) ?? record.point.id,
          source.streamUrl,
          "provider",
          record.point.id,
        ),
      ),
  );
  for (let i = 0; i < values.length; i += 250) {
    await tx
      .insert(schema.radioStreamSources)
      .values(values.slice(i, i + 250))
      .onConflictDoUpdate({
        target: schema.radioStreamSources.sourceKey,
        set: { enabled: true, stationId: sql`excluded.station_id` },
      });
  }
}

/** Safe to repeat after migration, without needing a fresh external scan. */
export async function backfillProviderSources() {
  await getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(72409188)`);
    const records = await tx
      .select({ record: schema.radioCatalogEntries.record })
      .from(schema.radioCatalogEntries)
      .innerJoin(
        schema.radioCatalogGenerations,
        and(
          eq(schema.radioCatalogGenerations.id, schema.radioCatalogEntries.generationId),
          eq(schema.radioCatalogGenerations.active, true),
        ),
      );
    await publishProviderSources(
      tx,
      records.map((r) => r.record),
    );
  });
}

export async function requestStationRecheck(
  stationId: string,
  tx: RadioTransaction | ReturnType<typeof getDb> = getDb(),
) {
  const rows = await tx
    .update(schema.radioStreamSources)
    .set({ nextCheck: new Date(), lastRequested: new Date() })
    .where(
      and(
        eq(schema.radioStreamSources.stationId, stationId),
        eq(schema.radioStreamSources.enabled, true),
        sql`(${schema.radioStreamSources.lastRequested} is null or ${schema.radioStreamSources.lastRequested} < now() - interval '5 minutes')`,
        sql`not exists (select 1 from media_blocks where mode_id='radio' and point_id=${stationId})`,
        sql`not exists (select 1 from radio_curated_stations c where c.station_id=${stationId} and not c.enabled)`,
      ),
    )
    .returning({ id: schema.radioStreamSources.id });
  return rows.length;
}
export async function markSourcesPlayed(ids: string[]) {
  if (!ids.length) return;
  await getDb()
    .update(schema.radioStreamSources)
    .set({
      lastPlayed: new Date(),
      nextCheck: sql`least(${schema.radioStreamSources.nextCheck}, now() + interval '1 hour')`,
    })
    .where(inArray(schema.radioStreamSources.id, ids));
}
