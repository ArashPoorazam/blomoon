import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getOptionalUser } from "@/lib/auth/server";
import { normalizeCountryCode, findCountryByCode } from "@/lib/geo";
import { normalizeStation } from "./normalize";
import { browserStreamUrl } from "./playbackSources";
import { directoryEntry } from "./directorySync";
import { stationIdentityKey, streamIdentity } from "./stationIdentity";
import { getRadioStationRecord } from "./catalog";
import { sourceInput, requestStationRecheck } from "./health/sources";
import { verifiedStationPredicate, availabilityForStations } from "./health/query";

export class RadioAdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function isRadioAdmin(
  user: { id: string; emailVerified: boolean } | null,
  configured = process.env.BLOMOON_ADMIN_USER_IDS ?? "",
) {
  return Boolean(
    user?.emailVerified &&
      configured
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .includes(user.id),
  );
}
export async function requireRadioAdmin() {
  const user = await getOptionalUser();
  if (!isRadioAdmin(user)) throw new RadioAdminError(user ? 403 : 401, "Administrator access required.");
  return user!;
}
export function assertAdminOrigin(request: Request) {
  const expected = process.env.BETTER_AUTH_URL;
  const origin = request.headers.get("origin");
  if (!expected || !origin || new URL(expected).origin !== origin)
    throw new RadioAdminError(403, "Invalid request origin.");
}
const optionalUrl = z
  .union([
    z.literal(""),
    z
      .url()
      .max(2000)
      .refine((v) => /^https?:\/\//.test(v)),
  ])
  .default("");
export const curatedStationInput = z
  .object({
    name: z.string().trim().min(1).max(400),
    countryCode: z.string().refine((v) => Boolean(normalizeCountryCode(v)), "Invalid country"),
    language: z.string().trim().max(200).default(""),
    tags: z.string().max(500).default(""),
    homepage: optionalUrl,
    artwork: optionalUrl,
    latitude: z.number().min(-90).max(90).nullable().default(null),
    longitude: z.number().min(-180).max(180).nullable().default(null),
    streams: z
      .array(
        z
          .string()
          .max(2000)
          .refine((v) => Boolean(browserStreamUrl(v)), "Invalid stream URL"),
      )
      .min(1)
      .max(10),
    enabled: z.boolean().default(true),
    attachToId: z.uuid().optional(),
  })
  .strict()
  .refine((v) => (v.latitude === null) === (v.longitude === null), "Provide both coordinates or neither");

export async function readAdminBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new RadioAdminError(415, "JSON required.");
  const reader = request.body?.getReader();
  if (!reader) throw new RadioAdminError(400, "Missing body.");
  let size = 0;
  const parts: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 32_768) {
        await reader.cancel();
        throw new RadioAdminError(413, "Request too large.");
      }
      parts.push(value);
    }
    try {
      return JSON.parse(Buffer.concat(parts).toString());
    } catch {
      throw new RadioAdminError(400, "Invalid JSON.");
    }
  } finally {
    reader.releaseLock();
  }
}
export async function saveCuratedStation(actorId: string, input: unknown, id?: string) {
  const parsed = curatedStationInput.safeParse(input);
  if (!parsed.success) throw new RadioAdminError(400, parsed.error.issues[0]?.message ?? "Invalid station.");
  const value = parsed.data;
  if (id && value.attachToId && id !== value.attachToId)
    throw new RadioAdminError(400, "Station identity cannot be changed.");
  const target = id ?? value.attachToId;
  const existing = target ? await getRadioStationRecord(target) : null;
  if (target && !existing) throw new RadioAdminError(404, "Station not found.");
  const stationId = existing?.point.id ?? randomUUID();
  const record = normalizeStation({
    stationuuid: stationId,
    name: value.name,
    countrycode: normalizeCountryCode(value.countryCode),
    country: findCountryByCode(normalizeCountryCode(value.countryCode))?.name,
    language: value.language,
    tags: value.tags,
    url: value.streams[0],
    homepage: value.homepage,
    favicon: value.artwork,
    geo_lat: value.latitude,
    geo_long: value.longitude,
    lastcheckok: 1,
  });
  if (!record) throw new RadioAdminError(400, "Station location or stream is invalid.");
  if (value.latitude !== null && record.point.locationPrecision !== "station")
    throw new RadioAdminError(400, "Coordinates must fall within the selected country.");
  const { generationId: _generation, ...entry } = directoryEntry(record, stationId);
  await getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(72409189)`);
    if (!target) {
      const [duplicate] = await tx
        .select({ id: schema.radioStationAliases.canonicalId })
        .from(schema.radioStationAliases)
        .where(
          or(
            eq(schema.radioStationAliases.identityKey, stationIdentityKey(record)),
            eq(schema.radioStationAliases.streamKey, streamIdentity(record.streamUrl)),
          ),
        )
        .limit(1);
      const [sameStream] = await tx
        .select({ id: schema.radioStreamSources.stationId })
        .from(schema.radioStreamSources)
        .where(
          inArray(
            schema.radioStreamSources.streamUrl,
            value.streams.map((v) => browserStreamUrl(v)!),
          ),
        )
        .limit(1);
      if (duplicate || sameStream)
        throw new RadioAdminError(
          409,
          `This station or stream already exists. Edit station ${(duplicate ?? sameStream).id} to attach sources.`,
        );
    }
    const [before] = await tx
      .select()
      .from(schema.radioCuratedStations)
      .where(eq(schema.radioCuratedStations.stationId, stationId));
    // Reserve the public identity before provider scans can discover the same station.
    await tx.insert(schema.radioStationAliases).values({stationId,canonicalId:stationId,identityKey:stationIdentityKey(record),streamKey:streamIdentity(record.streamUrl),record})
      .onConflictDoNothing();
    await tx
      .insert(schema.radioCuratedStations)
      .values({ ...entry, enabled: value.enabled })
      .onConflictDoUpdate({
        target: schema.radioCuratedStations.stationId,
        set: { ...entry, enabled: value.enabled, updatedAt: new Date() },
      });
    await tx
      .update(schema.radioStreamSources)
      .set({ enabled: false })
      .where(
        and(
          eq(schema.radioStreamSources.stationId, stationId),
          eq(schema.radioStreamSources.origin, "curated"),
        ),
      );
    const urls = [...new Set(value.streams.map((v) => browserStreamUrl(v)!))];
    await tx
      .insert(schema.radioStreamSources)
      .values(urls.map((url) => ({ ...sourceInput(stationId, url, "curated"), enabled: value.enabled })))
      .onConflictDoUpdate({ target: schema.radioStreamSources.sourceKey, set: { enabled: value.enabled } });
    await tx.insert(schema.radioAdminAudit).values({
      actorId,
      stationId,
      action: before ? "update" : "create",
      changes: { before: before ?? null, after: { ...entry, enabled: value.enabled, streams: urls } },
    });
  });
  return { id: stationId };
}
export async function recheckAsAdmin(actorId: string, id: string) {
  const record = await getRadioStationRecord(id);
  if (!record) throw new RadioAdminError(404, "Station not found.");
  return getDb().transaction(async (tx) => {
    const queued = await requestStationRecheck(record.point.id, tx);
    if (!queued)
      throw new RadioAdminError(
        429,
        "No sources can be queued. Disabled stations cannot be checked; retries are limited to once every five minutes.",
      );
    await tx
      .insert(schema.radioAdminAudit)
      .values({ actorId, stationId: record.point.id, action: "recheck", changes: { queued } });
    return { queued };
  });
}
export async function listAdminStations(query: string) {
  if (query.length > 120) throw new RadioAdminError(400, "Search must be 120 characters or fewer.");
  // Include disabled curated entries; the public view deliberately excludes them.
  const rows = await getDb().execute<{
    station_id: string;
    record: typeof schema.radioDirectory.$inferSelect.record;
    curated: boolean;
    enabled: boolean;
  }>(sql`
    select station_id,record,false as curated,true as enabled from radio_directory d
    where not exists(select 1 from radio_curated_stations c where c.station_id=d.station_id) and name_text ilike ${`%${query}%`}
    union all select station_id,record,true as curated,enabled from radio_curated_stations where name_text ilike ${`%${query}%`}
    order by station_id limit 50`);
  const ids = rows.map((r) => r.station_id);
  const [availability, streams] = await Promise.all([
    availabilityForStations(ids),
    ids.length
      ? getDb()
          .select()
          .from(schema.radioStreamSources)
          .where(inArray(schema.radioStreamSources.stationId, ids))
      : Promise.resolve([]),
  ]);
  return rows.map((row) => ({
    ...row,
    availability: availability.get(row.station_id)!,
    streams: streams.filter((s) => s.stationId === row.station_id),
  }));
}
export async function radioHealthMetrics() {
  const [countries, queue, worker, generation] = await Promise.all([
    getDb()
      .select({ country: schema.radioDirectory.countryCode, count: sql<number>`count(*)::int` })
      .from(schema.radioDirectory)
      .where(verifiedStationPredicate(schema.radioDirectory.stationId))
      .groupBy(schema.radioDirectory.countryCode),
    getDb().execute<{
      total: number;
      due: number;
      oldest_due: string | null;
      verified: number;
    }>(sql`select count(*)::int as total, count(*) filter(where enabled and next_check<now())::int as due,
      min(next_check) filter(where enabled) as oldest_due,
      count(*) filter(where last_success>now()-interval '24 hours' and failures<3 and enabled)::int as verified from radio_stream_sources`),
    getDb().select().from(schema.radioHealthWorker),
    getDb()
      .select()
      .from(schema.radioCatalogGenerations)
      .where(eq(schema.radioCatalogGenerations.active, true)),
  ]);
  const outcomes = await getDb().execute<{ reason: string; count: number }>(
    sql`select coalesce(reason,'healthy_or_pending') as reason,count(*)::int as count from radio_stream_sources group by reason`,
  );
  return {
    countries,
    queue: queue[0],
    worker: worker[0] ?? null,
    generation: generation[0] ?? null,
    outcomes,
  };
}
