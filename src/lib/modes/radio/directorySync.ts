import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { countrySearchText } from "@/lib/geo/countrySearch";
import { normalizeSearchText, searchTerms } from "@/lib/search/text";
import { logger } from "@/lib/server/logging";
import { normalizeStation } from "./normalize";
import { fetchRadioBrowserHostJson, getRadioBrowserHosts } from "./provider";
import type { RadioStationRecord } from "./types";

export const CATALOG_REFRESH_MS = 6 * 60 * 60 * 1000;
const PAGE_SIZE = 5000;
const textValue = z.string().max(10_000).optional();
const numberValue = z.union([z.number().finite(), z.string().max(64)]).optional();
const timestampValue = z.union([z.literal(""), z.iso.datetime({ offset: true })]).optional();
const stationSchema = z.object({
  stationuuid: z.uuid(), name: textValue, url: textValue, url_resolved: textValue,
  homepage: textValue, favicon: textValue, tags: textValue, country: textValue,
  countrycode: textValue, state: textValue, language: textValue, languagecodes: textValue,
  votes: numberValue, clickcount: numberValue, codec: textValue, bitrate: numberValue,
  lastcheckok: numberValue, lastchecktime_iso8601: timestampValue, lastcheckoktime_iso8601: timestampValue,
  geo_lat: numberValue.nullable(), geo_long: numberValue.nullable(),
});

export function parseDirectoryPage(payload: unknown) {
  if (!Array.isArray(payload) || payload.length > PAGE_SIZE) throw new Error("Invalid directory page");
  const records: RadioStationRecord[] = [];
  let invalid = 0;
  for (const input of payload) {
    const parsed = stationSchema.safeParse(input);
    if (!parsed.success) { invalid++; continue; }
    const record = normalizeStation(parsed.data);
    if (record) records.push(record);
  }
  if (invalid > Math.max(5, payload.length * 0.05)) throw new Error("Malformed directory response");
  return { records, rawCount: payload.length };
}

export function validateDirectorySize(count: number, previous: number, providerCount: number) {
  if (count < 1000 || count < previous * 0.8 || count < providerCount * 0.8) {
    throw new Error("Incomplete directory scan; retaining previous catalog");
  }
}

export function directoryEntry(record: RadioStationRecord, generationId: string) {
  const nameText = normalizeSearchText(record.point.name);
  const countryText = normalizeSearchText(`${record.point.metrics?.Country ?? ""} ${countrySearchText(record.point.countryCode)}`);
  const languageText = normalizeSearchText(String(record.point.metrics?.Language ?? ""));
  const tagText = normalizeSearchText(String(record.point.metrics?.Tags ?? ""));
  return {
    generationId, stationId: record.point.id, countryCode: record.point.countryCode,
    nameText, countryText, languageText, tagText,
    searchText: [nameText, countryText, languageText, tagText].join(" "),
    votes: Math.max(0, Math.round(record.votes)), clicks: Math.max(0, Math.round(record.clickCount)), record,
  };
}

export async function syncRadioDirectory() {
  return getDb().transaction(async (tx) => {
    const [lock] = await tx.execute<{ acquired: boolean }>(sql`select pg_try_advisory_xact_lock(72409188) as acquired`);
    if (!lock.acquired) return { status: "busy" as const };
    const [previous] = await tx.select().from(schema.radioCatalogGenerations).where(eq(schema.radioCatalogGenerations.active, true));
    const hosts = (await getRadioBrowserHosts()).slice(0, 3);
    let records: RadioStationRecord[] | null = null;
    for (const host of hosts) {
      try {
        records = await scanHost(host, previous?.stationCount ?? 0);
        break;
      } catch (error) {
        logger.warn("radio.directory.scan_failed", { context: { host }, error, message: "Directory scan failed; trying another host" });
      }
    }
    if (!records) throw new Error("Directory synchronization failed on all hosts");
    const [generation] = await tx.insert(schema.radioCatalogGenerations).values({}).returning();
    const vocabulary = new Set<string>();
    for (let offset = 0; offset < records.length; offset += 250) {
      const entries = records.slice(offset, offset + 250).map((record) => directoryEntry(record, generation.id));
      for (const entry of entries) for (const term of searchTerms(entry.searchText)) if (term.length <= 120) vocabulary.add(term);
      await tx.insert(schema.radioCatalogEntries).values(entries);
    }
    const terms = [...vocabulary];
    for (let offset = 0; offset < terms.length; offset += 1000) {
      await tx.insert(schema.radioCatalogTerms).values(terms.slice(offset, offset + 1000).map((term) => ({ generationId: generation.id, term })));
    }
    await tx.update(schema.radioCatalogGenerations).set({ active: false }).where(eq(schema.radioCatalogGenerations.active, true));
    await tx.update(schema.radioCatalogGenerations).set({ active: true, publishedAt: new Date(), stationCount: records.length })
      .where(eq(schema.radioCatalogGenerations.id, generation.id));
    await tx.delete(schema.radioCatalogGenerations).where(and(eq(schema.radioCatalogGenerations.active, false),
      lt(schema.radioCatalogGenerations.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))));
    await tx.delete(schema.radioRecommendationSnapshots).where(lt(schema.radioRecommendationSnapshots.expiresAt, new Date()));
    logger.info("radio.directory.published", { context: { stations: records.length, generation: generation.id }, message: "Complete radio directory published" });
    return { status: "published" as const, stations: records.length };
  });
}

async function scanHost(host: string, previousCount: number) {
  const stats = z.object({ stations: z.coerce.number().positive(), stations_broken: z.coerce.number().nonnegative() })
    .parse(await fetchRadioBrowserHostJson<unknown>(host, "/json/stats", {}, { cache: "no-store" }));
  const records = new Map<string, RadioStationRecord>();
  const deadline = Date.now() + 15 * 60 * 1000;
  for (let offset = 0; offset < 100_000; offset += PAGE_SIZE) {
    if (Date.now() > deadline) throw new Error("Directory scan exceeded time budget");
    const page = parseDirectoryPage(await fetchRadioBrowserHostJson<unknown>(host, "/json/stations", {
      limit: String(PAGE_SIZE), offset: String(offset), order: "name", reverse: "false", hidebroken: "true",
    }, { cache: "no-store", timeoutMs: 30_000 }));
    for (const record of page.records) records.set(record.point.id, record);
    logger.info("radio.directory.page", { context: { offset, received: page.rawCount, usable: records.size }, message: "Directory scan progress" });
    if (page.rawCount < PAGE_SIZE) {
      validateDirectorySize(records.size, previousCount, stats.stations - stats.stations_broken);
      return [...records.values()];
    }
  }
  throw new Error("Directory exceeds scan safety limit");
}
