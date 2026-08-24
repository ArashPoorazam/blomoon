import type { DataSourceInfo, TerraDataset, TerraPlayableAudio, TerraPointPage } from "../types";
import { RADIO_FIXTURE_RECORDS, RADIO_FIXTURE_SOURCE } from "../fixtures/radio";
import {
  COUNTRY_MARKER_LIMIT,
  FALLBACK_CACHE_TTL_MS,
  STATION_CACHE_TTL_MS,
  STREAM_CACHE_TTL_MS,
  STREAM_VALIDATION_TIMEOUT_MS
} from "./config";
import {
  compareRadioRecords,
  getLiveCountryMarkerRecords,
  getLiveCountryRecordPage,
  getLiveWorldRecords,
  sortRadioRecords
} from "./livePages";
import { getLiveRadioRecordPage } from "./searchPages";
import type { RadioSortOption } from "./api";
import { isSafeStreamUrl, normalizeStation } from "./normalize";
import { fetchRadioBrowserJson } from "./provider";
import type {
  PlayableCacheEntry,
  RadioBrowserStation,
  RadioClickResponse,
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
  const catalog = createRadioCatalog(createFixtureRecords(), RADIO_FIXTURE_SOURCE, Date.now(), true);

  return {
    modeId: "radio",
    source: catalog.source,
    points: catalog.worldRecords.map((record) => record.point)
  };
}

export async function getRadioCountryMarkerDataset(countryCode: string): Promise<TerraDataset> {
  try {
    const records = await getLiveCountryMarkerRecords(countryCode);

    return {
      modeId: "radio",
      source: createLiveSource(),
      points: records.map((record) => record.point)
    };
  } catch {
    const catalog = await getRadioCatalog();
    const records = catalog.recordsByCountry.get(countryCode) ?? [];

    return {
      modeId: "radio",
      source: createFallbackSource(catalog.source),
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
      source: createLiveSource(),
      points: page.records.map((record) => record.point),
      limit,
      nextOffset: page.nextOffset,
      offset,
      total: page.total,
      totalKind: page.totalKind
    };
  } catch {
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
      source: createLiveSource(),
      points: page.records.map((record) => record.point),
      limit,
      nextOffset: page.nextOffset,
      offset,
      total: page.total,
      totalKind: page.totalKind
    };
  } catch {
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

export async function getRadioPlayableStream(id: string): Promise<TerraPlayableAudio | null> {
  const now = Date.now();
  const cached = playableCache.get(id);

  if (cached && now - cached.fetchedAt < STREAM_CACHE_TTL_MS) {
    return cached.stream;
  }

  const record = await getRadioStationRecord(id);

  if (!record) {
    return null;
  }

  const clickedUrl = await resolveClickedStationUrl(id);
  const streamUrl = clickedUrl ?? record.streamUrl;
  const validation = await validateStreamUrl(streamUrl);
  const stream: TerraPlayableAudio = {
    checkedAt: new Date().toISOString(),
    contentType: validation.contentType,
    mediaKind: "audio",
    pointId: id,
    streamUrl
  };

  playableCache.set(id, {
    fetchedAt: now,
    stream
  });

  return stream;
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
    const records = await getLiveWorldRecords();

    if (records.length === 0) {
      throw new Error("Radio Browser returned no usable stations");
    }

    catalogCache = createRadioCatalog(records, createLiveSource(), fetchedAt, false);
  } catch {
    catalogCache = catalogCache && !catalogCache.isFallback
      ? catalogCache
      : createRadioCatalog(createFixtureRecords(), RADIO_FIXTURE_SOURCE, fetchedAt, true);
  }

  return catalogCache;
}

function createLiveSource(): DataSourceInfo {
  return {
    name: "Radio Browser",
    url: "https://www.radio-browser.info/",
    attribution: "Community radio station data provided by Radio Browser.",
    lastUpdated: new Date().toISOString()
  };
}

function createFallbackSource(source: DataSourceInfo): DataSourceInfo {
  return {
    ...source,
    isFallback: true
  };
}

async function getRadioStationRecord(id: string) {
  const catalog = await getRadioCatalog();
  const cachedRecord = catalog.recordsById.get(id);

  if (cachedRecord) {
    return cachedRecord;
  }

  try {
    const stations = await fetchRadioBrowserJson<RadioBrowserStation[]>(`/json/stations/byuuid/${encodeURIComponent(id)}`);
    const record = normalizeStation(stations[0]);

    if (record && catalogCache) {
      addRecordToCatalog(catalogCache, record);
      return record;
    }
  } catch {
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
  const sortedRecords = sortRadioRecords(records);
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
    source: createFallbackSource(catalog.source),
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
    source: createFallbackSource(catalog.source),
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

function createFixtureRecords(): RadioStationRecord[] {
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

function getNumericMetric(record: { metrics?: Record<string, string | number | null> }, key: string) {
  const value = record.metrics?.[key];
  return typeof value === "number" ? value : 0;
}

async function resolveClickedStationUrl(id: string) {
  try {
    const response = await fetchRadioBrowserJson<RadioClickResponse>(`/json/url/${encodeURIComponent(id)}`);
    return response.ok && isSafeStreamUrl(response.url) ? response.url : null;
  } catch {
    return null;
  }
}

async function validateStreamUrl(streamUrl: string) {
  if (!isSafeStreamUrl(streamUrl)) {
    throw new Error("Station stream URL is not playable.");
  }

  const headResult = await probeStream(streamUrl, "HEAD");

  if (headResult.ok) {
    return headResult;
  }

  const getResult = await probeStream(streamUrl, "GET");

  if (getResult.ok) {
    return getResult;
  }

  throw new Error("Station stream did not respond with a playable status.");
}

async function probeStream(streamUrl: string, method: "GET" | "HEAD") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STREAM_VALIDATION_TIMEOUT_MS);

  try {
    const response = await fetch(streamUrl, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "audio/*,*/*;q=0.8",
        ...(method === "GET" ? { range: "bytes=0-0" } : {})
      }
    });

    if (method === "GET") {
      await response.body?.cancel();
    }

    return {
      ok: response.ok || response.status === 206,
      contentType: response.headers.get("content-type") ?? undefined
    };
  } catch {
    return {
      ok: false,
      contentType: undefined
    };
  } finally {
    clearTimeout(timeout);
  }
}
