import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { TerraDataset, TerraRandomPoint } from "../types";
import { RADIO_FIXTURE_RECORDS, RADIO_FIXTURE_SOURCE } from "../fixtures/radio";
import { searchRadioDirectory, directorySource, activeRadioDirectory } from "./directory";
import { discoveryEligibility, stationAvailability } from "./health/query";
import { lookupCanonicalRecord } from "./identityStore";
import type { RadioStationRecord, RadioStationPersistenceSnapshot } from "./types";

export { getRadioDataset } from "./globeCatalog";

export async function getRadioCountryMarkerDataset(countryCode: string): Promise<TerraDataset> {
  return searchRadioDirectory({ countryCode, query: "", sort: "votes_desc", limit: 50, offset: 0 });
}
export async function getRadioStationRecord(id: string): Promise<RadioStationRecord | null> {
  const canonical = await lookupCanonicalRecord(id);
  const canonicalId = canonical?.point.id ?? id;
  const [curated] = await getDb()
    .select({ record: schema.radioCuratedStations.record })
    .from(schema.radioCuratedStations)
    .where(eq(schema.radioCuratedStations.stationId, canonicalId));
  return curated?.record ?? canonical;
}
export async function getRadioDetail(id: string) {
  const record = await getRadioStationRecord(id);
  return record ? { ...record.detail, availability: await stationAvailability(record.point.id) } : null;
}
export async function getRadioStationPersistenceSnapshot(id: string) {
  const record = await getRadioStationRecord(id);
  return record ? toPersistenceSnapshot(record) : null;
}
export async function getRandomRadioPoint({
  excludePointId,
}: { excludePointId?: string | null } = {}): Promise<TerraRandomPoint | null> {
  const entries = schema.radioDirectory;
  const [row] = await getDb()
    .select({ record: entries.record })
    .from(entries)
    .where(
      and(
        discoveryEligibility(entries.stationId),
        excludePointId ? sql`${entries.stationId}<>${excludePointId}` : undefined,
      ),
    )
    .orderBy(sql`random()`)
    .limit(1);
  return row
    ? {
        modeId: "radio",
        point: row.record.point,
        source: await directorySource((await activeRadioDirectory())?.publishedAt),
      }
    : null;
}
/** Explicit development fixture API; never used as a production fallback. */
export function getRadioFixtureDataset(): TerraDataset {
  return { modeId: "radio", points: RADIO_FIXTURE_RECORDS.map((r) => r.point), source: RADIO_FIXTURE_SOURCE };
}
function getNumericMetric(record: { metrics?: Record<string, string | number | null> }, key: string) {
  const value = record.metrics?.[key];
  return typeof value === "number" ? value : 0;
}

function getTextMetric(record: { metrics?: Record<string, string | number | null> }, key: string) {
  const value = record.metrics?.[key];
  return typeof value === "string" && value !== "Unknown" && value !== "Untagged" ? value : null;
}

function getBitrate(record: RadioStationRecord) {
  const value = record.detail.fields.find((field) => field.label === "Bitrate")?.value;

  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function toPersistenceSnapshot(record: RadioStationRecord): RadioStationPersistenceSnapshot {
  const tags =
    getTextMetric(record.point, "Tags")
      ?.split(",")
      .map((tag) => tag.trim())
      .filter(Boolean) ?? [];

  return {
    artworkUrl: record.point.artworkUrl ?? null,
    bitrate: getBitrate(record),
    clickCount: record.clickCount,
    codec: getTextMetric(record.point, "Codec"),
    country: getTextMetric(record.point, "Country") ?? "Unknown country",
    countryCode: record.point.countryCode,
    id: record.point.id,
    language: getTextMetric(record.point, "Language"),
    latitude: record.point.latitude,
    locationPrecision: record.point.locationPrecision ?? "country",
    longitude: record.point.longitude,
    metrics: record.point.metrics ?? {},
    name: record.point.name,
    sourceUrl: record.detail.sourceUrl ?? null,
    streamUrl: record.streamUrl,
    summary: record.point.summary,
    tags,
    timestamp: record.point.timestamp ?? null,
    votes: record.votes,
  };
}
