import type { DataSourceInfo, TerraDataset, TerraPlayableAudio, TerraPointPage, TerraRandomPoint } from "../types";
import { RADIO_FIXTURE_RECORDS, RADIO_FIXTURE_SOURCE } from "../fixtures/radio";
import {
  COUNTRY_MARKER_LIMIT,
  FALLBACK_CACHE_TTL_MS,
  STATION_CACHE_TTL_MS,
  STREAM_CACHE_TTL_MS
} from "./config";
import {
  compareRadioRecords,
  getLiveCountryMarkerRecords,
  getLiveCountryRecordPage,
  getLiveTopVotedWorldRecords,
  sortRadioRecords
} from "./livePages";
import { createRadioFallbackSource, createRadioLiveSource } from "./source";
import { getLiveRadioRecordPage } from "./searchPages";
import type { RadioSortOption } from "./api";
import { resolveRadioStream } from "./streamValidation";
import { isSafeStreamUrl, normalizeStation } from "./normalize";
import { fetchRadioBrowserJson } from "./provider";
import { getLiveRandomRadioRecord } from "./random";
import { getRandomCatalogRecord } from "./randomSelection";
import { logger } from "@/lib/server/logging";
import { canonicalizeAvailableRecords, lookupCanonicalRecord, registerRadioRecord } from "./identityStore";
import { canonicalizeRadioRecords } from "./stationIdentity";
import type {
  PlayableCacheEntry,
  RadioBrowserStation,
  RadioClickResponse,
  RadioStationPersistenceSnapshot,
  RadioStationRecord
} from "./types";

type RadioCatalog = {
  fetchedAt: number;
  isFallback: boolean;
  records: RadioStationRecord[];
  recordsByCountry: Map<string, RadioStationRecord[]>;
  recordsById: Map<string, RadioStationRecord>;
  source: DataSourceInfo;
  worldRecords: RadioStationRecord[];
};

let catalogCache: RadioCatalog | null = null;
let catalogRefresh: Promise<RadioCatalog> | null = null;

const playableCache = new Map<string, PlayableCacheEntry>();

export async function getRadioDataset(force = false): Promise<TerraDataset> {
  const catalog = await getRadioCatalog(force);

  return {
    modeId: "radio",
    source: catalog.source,
    points: catalog.worldRecords.map((record) => record.point)
  };
}

export function getRadioFixtureDataset(): TerraDataset {
  const catalog = createRadioCatalog(getRadioFixtureRecords(), RADIO_FIXTURE_SOURCE, Date.now(), true);

  return {
    modeId: "radio",
    source: catalog.source,
    points: catalog.worldRecords.map((record) => record.point)
  };
}

export function getRadioFixtureRecords(): RadioStationRecord[] {
  return RADIO_FIXTURE_RECORDS
    .filter((record): record is typeof record & { point: typeof record.point & { countryCode: string } } => (
      Boolean(record.point.countryCode)
    ))
    .map((record) => {
      const votes = getNumericMetric(record.point, "Votes");
      const clickCount = getNumericMetric(record.point, "Clicks");
      const point = {
        ...record.point,
        locationPrecision: "station" as const,
        countryCode: record.point.countryCode
      };
      const detail = {
        ...record.detail,
        ...point
      };

      return {
        clickCount,
        detail,
        point,
        searchText: `${point.name} ${point.summary} ${Object.values(point.metrics ?? {}).join(" ")}`.toLowerCase(),
        streamUrl: record.streamUrl,
        votes
      };
    });
}

export async function getRadioCountryMarkerDataset(countryCode: string): Promise<TerraDataset> {
  try {
    const records = (await canonicalizeAvailableRecords(await getLiveCountryMarkerRecords(countryCode)))
      .filter((record) => record.point.countryCode === countryCode);

    return {
      modeId: "radio",
      source: createRadioLiveSource(),
      points: records.map((record) => record.point)
    };
  } catch (error) {
    logger.warn("radio.catalog.country_markers.fallback", {
      context: { countryCode },
      error,
      message: "Radio country marker request fell back to cached catalog"
    });
    const catalog = await getRadioCatalog();
    const records = catalog.recordsByCountry.get(countryCode) ?? [];

    return {
      modeId: "radio",
      source: createRadioFallbackSource(catalog.source),
      points: records.slice(0, COUNTRY_MARKER_LIMIT).map((record) => record.point)
    };
  }
}

export async function getRadioCountryPointPage({
  countryCode,
  limit,
  offset,
  query
}: {
  countryCode: string;
  limit: number;
  offset: number;
  query: string;
}): Promise<TerraPointPage> {
  try {
    const page = await getLiveCountryRecordPage({
      countryCode,
      limit,
      offset,
      query
    });

    return {
      modeId: "radio",
      source: createRadioLiveSource(),
      points: page.records.map((record) => record.point),
      limit,
      nextOffset: page.nextOffset,
      offset,
      total: page.total,
      totalKind: page.totalKind
    };
  } catch (error) {
    logger.warn("radio.catalog.country_page.fallback", {
      context: {
        countryCode,
        limit,
        offset,
        queryPresent: query.length > 0
      },
      error,
      message: "Radio country page request fell back to cached catalog"
    });
    const catalog = await getRadioCatalog();
    return getFallbackCountryPointPage(catalog, {
      countryCode,
      limit,
      offset,
      query
    });
  }
}

export async function getRadioPointPage({
  countryCode,
  limit,
  offset,
  query,
  sort
}: {
  countryCode: string | null;
  limit: number;
  offset: number;
  query: string;
  sort: RadioSortOption;
}): Promise<TerraPointPage> {
  try {
    const page = await getLiveRadioRecordPage({
      countryCode,
      limit,
      offset,
      query,
      sort
    });

    return {
      modeId: "radio",
      source: createRadioLiveSource(),
      points: page.records.map((record) => record.point),
      limit,
      nextOffset: page.nextOffset,
      offset,
      total: page.total,
      totalKind: page.totalKind
    };
  } catch (error) {
    logger.warn("radio.catalog.point_page.fallback", {
      context: {
        countryCode,
        limit,
        offset,
        queryPresent: query.length > 0,
        sort
      },
      error,
      message: "Radio point page request fell back to cached catalog"
    });
    const catalog = await getRadioCatalog();
    return getFallbackRadioPointPage(catalog, {
      countryCode,
      limit,
      offset,
      query,
      sort
    });
  }
}

export async function getRadioDetail(id: string) {
  const record = await getRadioStationRecord(id);
  return record?.detail ?? null;
}

export async function getRandomRadioPoint({
  excludePointId
}: {
  excludePointId?: string | null;
} = {}): Promise<TerraRandomPoint | null> {
  try {
    const record = await registerRadioRecord(await getLiveRandomRadioRecord({ excludePointId }));

    if (catalogCache) {
      addRecordToCatalog(catalogCache, record);
    }

    return {
      modeId: "radio",
      point: record.point,
      source: createRadioLiveSource()
    };
  } catch (error) {
    logger.warn("radio.catalog.random_fallback", {
      context: {
        excludePointId
      },
      error,
      message: "Radio random station request fell back to cached catalog"
    });
    const catalog = await getRadioCatalog();
    const record = getRandomCatalogRecord(catalog.records, { excludePointId });

    return record
      ? {
        modeId: "radio",
        point: record.point,
        source: createRadioFallbackSource(catalog.source)
      }
      : null;
  }
}

export async function getRadioPlayableStream(id: string): Promise<TerraPlayableAudio | null> {
  const now = Date.now();
  const startedAt = performance.now();
  const cached = playableCache.get(id);

  if (cached && now - cached.fetchedAt < STREAM_CACHE_TTL_MS) {
    logger.info("radio.playback.cache_hit", {
      context: { pointId: id },
      message: "Radio playable stream cache hit"
    });
    return cached.stream;
  }

  const record = await getRadioStationRecord(id);

  if (!record) {
    logger.warn("radio.playback.not_found", {
      context: { pointId: id },
      message: "Radio playable stream station was not found"
    });
    return null;
  }

  const clickedUrl = await resolveClickedStationUrl(id);
  const streamUrl = clickedUrl ?? record.streamUrl;
  let validation: Awaited<ReturnType<typeof resolveRadioStream>>;

  try {
    validation = await resolveRadioStream([clickedUrl ?? null, record.streamUrl]);
  } catch (error) {
    logger.warn("radio.playback.validation_failed", {
      context: {
        host: getUrlHost(streamUrl),
        pointId: id,
        usedClickedUrl: Boolean(clickedUrl)
      },
      durationMs: elapsedMs(startedAt),
      error,
      message: "Radio playable stream validation failed"
    });
    throw error;
  }

  const stream: TerraPlayableAudio = {
    checkedAt: new Date().toISOString(),
    contentType: validation.contentType,
    mediaKind: "audio",
    pointId: id,
    streamUrl: validation.streamUrl
  };

  playableCache.set(id, {
    fetchedAt: now,
    stream
  });

  logger.info("radio.playback.resolved", {
    context: {
      contentType: validation.contentType,
      host: getUrlHost(streamUrl),
      pointId: id,
      usedClickedUrl: Boolean(clickedUrl)
    },
    durationMs: elapsedMs(startedAt),
    message: "Radio playable stream resolved"
  });

  return stream;
}

export async function getRadioStationPersistenceSnapshot(id: string): Promise<RadioStationPersistenceSnapshot | null> {
  const record = await getRadioStationRecord(id);

  return record ? toPersistenceSnapshot(record) : null;
}

async function getRadioCatalog(force = false): Promise<RadioCatalog> {
  const now = Date.now();
  const cacheTtl = catalogCache?.isFallback ? FALLBACK_CACHE_TTL_MS : STATION_CACHE_TTL_MS;

  if (!force && catalogCache && now - catalogCache.fetchedAt < cacheTtl) {
    return catalogCache;
  }

  if (catalogRefresh) {
    return catalogRefresh;
  }

  catalogRefresh = refreshRadioCatalog(now)
    .finally(() => {
      catalogRefresh = null;
    });

  return catalogRefresh;
}

async function refreshRadioCatalog(fetchedAt: number) {
  try {
    const records = await getLiveTopVotedWorldRecords();

    if (records.length === 0) {
      throw new Error("Radio Browser returned no usable stations");
    }

    catalogCache = createRadioCatalog(records, createRadioLiveSource(), fetchedAt, false);
    logger.info("radio.catalog.refresh", {
      context: {
        records: catalogCache.records.length,
        worldRecords: catalogCache.worldRecords.length
      },
      message: "Radio catalog refreshed from live provider"
    });
  } catch (error) {
    logger.warn("radio.catalog.refresh_fallback", {
      error,
      message: "Radio catalog refresh failed; using cached or fixture data"
    });
    catalogCache = catalogCache && !catalogCache.isFallback
      ? catalogCache
      : createRadioCatalog(getRadioFixtureRecords(), RADIO_FIXTURE_SOURCE, fetchedAt, true);
  }

  return catalogCache;
}

async function getRadioStationRecord(id: string) {
  const canonical = await lookupCanonicalRecord(id);
  if (canonical) return canonical;
  const catalog = await getRadioCatalog();
  const cachedRecord = catalog.recordsById.get(id);

  if (cachedRecord) {
    return registerRadioRecord(cachedRecord);
  }

  try {
    const stations = await fetchRadioBrowserJson<RadioBrowserStation[]>(`/json/stations/byuuid/${encodeURIComponent(id)}`);
    const record = normalizeStation(stations[0]);

    if (record && catalogCache) {
      addRecordToCatalog(catalogCache, record);
      return registerRadioRecord(record);
    }
  } catch (error) {
    logger.warn("radio.catalog.detail_fetch_failed", {
      context: { pointId: id },
      error,
      message: "Radio station detail fetch failed"
    });
    return null;
  }

  return null;
}

function createRadioCatalog(
  records: RadioStationRecord[],
  source: DataSourceInfo,
  fetchedAt: number,
  isFallback: boolean
): RadioCatalog {
  const sortedRecords = sortRadioRecords(canonicalizeRadioRecords(records).records);
  const recordsById = new Map(sortedRecords.map((record) => [record.point.id, record]));
  const recordsByCountry = createCountryIndex(sortedRecords);

  return {
    fetchedAt,
    isFallback,
    records: sortedRecords,
    recordsByCountry,
    recordsById,
    source,
    worldRecords: selectWorldRecords(sortedRecords)
  };
}

function addRecordToCatalog(catalog: RadioCatalog, record: RadioStationRecord) {
  if (catalog.recordsById.has(record.point.id)) {
    return;
  }

  catalog.recordsById.set(record.point.id, record);
  catalog.records.push(record);

  const countryRecords = catalog.recordsByCountry.get(record.point.countryCode);

  if (countryRecords) {
    countryRecords.push(record);
    countryRecords.sort(compareRadioRecords);
    return;
  }

  catalog.recordsByCountry.set(record.point.countryCode, [record]);
}

function createCountryIndex(records: RadioStationRecord[]) {
  const recordsByCountry = new Map<string, RadioStationRecord[]>();

  records.forEach((record) => {
    const countryRecords = recordsByCountry.get(record.point.countryCode);

    if (countryRecords) {
      countryRecords.push(record);
      return;
    }

    recordsByCountry.set(record.point.countryCode, [record]);
  });

  return recordsByCountry;
}

function selectWorldRecords(records: RadioStationRecord[]) {
  return records;
}

function getFallbackCountryPointPage(
  catalog: RadioCatalog,
  {
    countryCode,
    limit,
    offset,
    query
  }: {
    countryCode: string;
    limit: number;
    offset: number;
    query: string;
  }
): TerraPointPage {
  const terms = normalizeQuery(query);
  const records = (catalog.recordsByCountry.get(countryCode) ?? [])
    .filter((record) => matchesSearch(record, terms));
  const points = records.slice(offset, offset + limit).map((record) => record.point);
  const nextOffset = offset + limit < records.length ? offset + limit : null;

  return {
    modeId: "radio",
    source: createRadioFallbackSource(catalog.source),
    points,
    limit,
    nextOffset,
    offset,
    total: records.length,
    totalKind: "exact"
  };
}

function getFallbackRadioPointPage(
  catalog: RadioCatalog,
  {
    countryCode,
    limit,
    offset,
    query,
    sort
  }: {
    countryCode: string | null;
    limit: number;
    offset: number;
    query: string;
    sort: RadioSortOption;
  }
): TerraPointPage {
  const terms = normalizeQuery(query);
  const sourceRecords = countryCode ? catalog.recordsByCountry.get(countryCode) ?? [] : catalog.records;
  const records = sortFallbackRecords(
    sourceRecords.filter((record) => matchesSearch(record, terms)),
    sort
  );
  const points = records.slice(offset, offset + limit).map((record) => record.point);
  const nextOffset = offset + limit < records.length ? offset + limit : null;

  return {
    modeId: "radio",
    source: createRadioFallbackSource(catalog.source),
    points,
    limit,
    nextOffset,
    offset,
    total: records.length,
    totalKind: "exact"
  };
}

function normalizeQuery(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function matchesSearch(record: RadioStationRecord, terms: string[]) {
  return terms.every((term) => record.searchText.includes(term));
}

function sortFallbackRecords(records: RadioStationRecord[], sort: RadioSortOption) {
  return [...records].sort((a, b) => {
    const direction = sort === "votes_desc" ? 1 : -1;
    const voteDiff = (b.votes - a.votes) * direction;

    if (voteDiff !== 0) {
      return voteDiff;
    }

    const clickDiff = (b.clickCount - a.clickCount) * direction;

    if (clickDiff !== 0) {
      return clickDiff;
    }

    return a.point.name.localeCompare(b.point.name);
  });
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
  const tags = getTextMetric(record.point, "Tags")?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [];

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
    votes: record.votes
  };
}

async function resolveClickedStationUrl(id: string) {
  try {
    const response = await fetchRadioBrowserJson<RadioClickResponse>(`/json/url/${encodeURIComponent(id)}`);
    return response.ok && isSafeStreamUrl(response.url) ? response.url : null;
  } catch (error) {
    logger.warn("radio.playback.click_url_failed", {
      context: { pointId: id },
      error,
      message: "Radio clicked URL resolution failed; using catalog stream URL"
    });
    return null;
  }
}

function elapsedMs(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}

function getUrlHost(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return "invalid-url";
  }
}
