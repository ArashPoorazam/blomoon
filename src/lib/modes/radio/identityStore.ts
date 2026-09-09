import "server-only";
import { eq, inArray, or, sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema, type BlomoonDb } from "@/db";
import { canonicalizeRadioRecords, stationIdentityKey, streamIdentity } from "./stationIdentity";
import type { RadioStationRecord } from "./types";

export type RadioTransaction = Parameters<Parameters<BlomoonDb["transaction"]>[0]>[0];
const aliases = schema.radioStationAliases;

export async function lookupCanonicalRecord(id: string): Promise<RadioStationRecord | null> {
  if (!isDatabaseConfigured()) return null;
  const [alias] = await getDb().select({ canonicalId: aliases.canonicalId }).from(aliases).where(eq(aliases.stationId, id));
  if (!alias) return null;
  const [canonical] = await getDb().select({ record: aliases.record }).from(aliases).where(eq(aliases.stationId, alias.canonicalId));
  return canonical?.record ?? null;
}

export async function canonicalizeAvailableRecords(records: RadioStationRecord[]) {
  if (!isDatabaseConfigured() || !records.length) return canonicalizeRadioRecords(records).records;
  const mapping = await canonicalizePointIds(records.map((record) => record.point.id));
  const ids = [...new Set(mapping.values())];
  const rows = ids.length ? await getDb().select().from(aliases).where(inArray(aliases.stationId, ids)) : [];
  const byId = new Map(rows.map((row) => [row.stationId, row.record]));
  return canonicalizeRadioRecords(records.map((record) => byId.get(mapping.get(record.point.id) ?? "") ?? record)).records;
}

export async function registerRadioRecord(record: RadioStationRecord) {
  if (!isDatabaseConfigured()) return record;
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(72409189)`);
    const existing = await tx.select().from(aliases).where(or(eq(aliases.stationId, record.point.id),
      eq(aliases.identityKey, stationIdentityKey(record)), eq(aliases.streamKey, streamIdentity(record.streamUrl))));
    const id = existing[0]?.canonicalId ?? record.point.id;
    const [canonical] = await tx.select().from(aliases).where(eq(aliases.stationId, id));
    if (existing.length && !canonical) throw new Error("Canonical station alias is missing its representative");
    const result = canonical?.record ?? record;
    await tx.insert(aliases).values({ stationId: record.point.id, canonicalId: id,
      identityKey: stationIdentityKey(record), streamKey: streamIdentity(record.streamUrl), record })
      .onConflictDoNothing();
    return result;
  });
}

/** Publish aliases and canonical records under the same lock as account consolidation. */
export async function publishStationIdentities(tx: RadioTransaction, records: RadioStationRecord[]) {
  await tx.execute(sql`select pg_advisory_xact_lock(72409189)`);
  const previous = await tx.select().from(aliases);
  const incoming = new Map(records.map((record) => [record.point.id, record]));
  const all = new Map(previous.map((alias) => [alias.stationId, alias.record]));
  for (const record of await persistedIdentityRecords(tx)) if (!all.has(record.point.id)) all.set(record.point.id, record);
  for (const [id, record] of incoming) all.set(id, record);
  const grouped = canonicalizeRadioRecords([...all.values()], previous);
  const canonicalRecords = new Map(grouped.records.map((record) => [record.point.id, record]));
  const activeGroups = new Map<string, RadioStationRecord[]>();
  for (const alias of grouped.aliases) {
    const record = incoming.get(alias.stationId);
    if (record) activeGroups.set(alias.canonicalId, [...(activeGroups.get(alias.canonicalId) ?? []), record]);
  }
  for (const [id, variants] of activeGroups) {
    variants.sort((a, b) => b.votes - a.votes || b.clickCount - a.clickCount || a.point.id.localeCompare(b.point.id));
    const record = variants.find((variant) => variant.point.id === id) ?? variants[0];
    canonicalRecords.set(id, { ...record, point: { ...record.point, id }, detail: { ...record.detail, id } });
  }
  const rows = grouped.aliases.map((alias) => {
    const record = alias.stationId === alias.canonicalId ? canonicalRecords.get(alias.canonicalId)! : all.get(alias.stationId)!;
    return { ...alias, identityKey: stationIdentityKey(record), streamKey: streamIdentity(record.streamUrl), record };
  });
  for (let offset = 0; offset < rows.length; offset += 250) {
    await tx.insert(aliases).values(rows.slice(offset, offset + 250)).onConflictDoUpdate({ target: aliases.stationId,
      set: { canonicalId: sql`excluded.canonical_id`, identityKey: sql`excluded.identity_key`,
        streamKey: sql`excluded.stream_key`, record: sql`excluded.record` } });
  }
  const previousIds = new Map(previous.map((alias) => [alias.stationId, alias.canonicalId]));
  if (grouped.aliases.some((alias) => previousIds.has(alias.stationId) && previousIds.get(alias.stationId) !== alias.canonicalId)) {
    await tx.delete(schema.radioRecommendationSnapshots);
  }
  const activeIds = new Set(grouped.aliases.filter((alias) => incoming.has(alias.stationId)).map((alias) => alias.canonicalId));
  return [...canonicalRecords.values()].filter((record) => activeIds.has(record.point.id));
}

export async function canonicalizePointIds(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const rows = await getDb().select({ stationId: aliases.stationId, canonicalId: aliases.canonicalId })
    .from(aliases).where(inArray(aliases.stationId, ids));
  return new Map(rows.map((row) => [row.stationId, row.canonicalId]));
}

export async function persistedIdentityRecords(tx: RadioTransaction): Promise<RadioStationRecord[]> {
  const rows = await tx.select().from(schema.mediaItems)
    .innerJoin(schema.radioStations, eq(schema.radioStations.mediaItemId, schema.mediaItems.id));
  return rows.map(({ media_items: item, radio_stations: station }) => {
    const point = { id: item.id, modeId: "radio" as const, name: item.name, summary: item.summary,
      countryCode: item.countryCode, latitude: item.latitude, longitude: item.longitude,
      locationPrecision: item.locationPrecision, prominence: 0.5, metrics: item.providerMetadata };
    return { point, detail: { ...point, fields: [], sourceUrl: item.sourceUrl ?? undefined },
      streamUrl: station.streamUrl, votes: station.providerVotes, clickCount: station.providerClicks,
      searchText: item.name };
  });
}
