import type { DataSourceInfo, TerraDataset, TerraPlayableAudio, TerraPointPage } from "../types";
import { RADIO_FIXTURE_RECORDS, RADIO_FIXTURE_SOURCE } from "../fixtures/radio";
import { getAlphaCountryCode } from "@/lib/geo";
import {
  COUNTRY_MARKER_LIMIT,
  FALLBACK_CACHE_TTL_MS,
  RADIO_PROVIDER_CATALOG_LIMIT,
  RADIO_PROVIDER_COUNTRY_LIMIT,
  STATION_CACHE_TTL_MS,
  STREAM_CACHE_TTL_MS,
  STREAM_VALIDATION_TIMEOUT_MS,
  WORLD_MARKER_LIMIT,
  WORLD_MIN_COUNTRY_STATIONS
} from "./config";
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
const countryRecordCache = new Map<string, {
  fetchedAt: number;
  records: RadioStationRecord[];
}>();

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
  const { records, source } = await getCountryRecordsWithSource(countryCode);

  return {
    modeId: "radio",
    source,
    points: records.slice(0, COUNTRY_MARKER_LIMIT).map((record) => record.point)
  };
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
  const { records: countryRecords, source } = await getCountryRecordsWithSource(countryCode);
  const terms = normalizeQuery(query);
  const records = countryRecords.filter((record) => matchesSearch(record, terms));
  const points = records.slice(offset, offset + limit).map((record) => record.point);
  const nextOffset = offset + limit < records.length ? offset + limit : null;

  return {
    modeId: "radio",
    source,
    points,
    limit,
    nextOffset,
    offset,
    total: records.length
  };
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
    const stations = await fetchRadioBrowserJson<RadioBrowserStation[]>("/json/stations/topvote", {
      hidebroken: "true",
      limit: String(RADIO_PROVIDER_CATALOG_LIMIT)
    });
    const records = stations
      .map(normalizeStation)
      .filter((record): record is RadioStationRecord => Boolean(record));

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
    worldRecords: selectWorldRecords(sortedRecords, recordsByCountry)
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

function selectWorldRecords(records: RadioStationRecord[], recordsByCountry: Map<string, RadioStationRecord[]>) {
  const selected = new Map<string, RadioStationRecord>();

  Array.from(recordsByCountry.entries())
    .sort(([countryA], [countryB]) => countryA.localeCompare(countryB))
    .forEach(([, countryRecords]) => {
      countryRecords.slice(0, WORLD_MIN_COUNTRY_STATIONS).forEach((record) => {
        if (selected.size < WORLD_MARKER_LIMIT) {
          selected.set(record.point.id, record);
        }
      });
    });

  for (const record of records) {
    if (selected.size >= WORLD_MARKER_LIMIT) {
      break;
    }

    selected.set(record.point.id, record);
  }

  return Array.from(selected.values());
}

async function getCountryRecordsWithSource(countryCode: string) {
  try {
    return {
      records: await getLiveCountryRecords(countryCode),
      source: createLiveSource()
    };
  } catch {
    const catalog = await getRadioCatalog();

    return {
      records: catalog.recordsByCountry.get(countryCode) ?? [],
      source: catalog.source
    };
  }
}

async function getCountryRecords(catalog: RadioCatalog, countryCode: string) {
  try {
    return await getLiveCountryRecords(countryCode);
  } catch {
    return catalog.recordsByCountry.get(countryCode) ?? [];
  }
}

async function getLiveCountryRecords(countryCode: string) {
  const now = Date.now();
  const cached = countryRecordCache.get(countryCode);

  if (cached && now - cached.fetchedAt < STATION_CACHE_TTL_MS) {
    return cached.records;
  }

  const alphaCode = getAlphaCountryCode(countryCode);

  if (!alphaCode) {
    return [];
  }

  const stations = await fetchRadioBrowserJson<RadioBrowserStation[]>(
    `/json/stations/bycountrycodeexact/${encodeURIComponent(alphaCode.toLowerCase())}`,
    {
      hidebroken: "true",
      limit: String(RADIO_PROVIDER_COUNTRY_LIMIT),
      order: "votes",
      reverse: "true"
    }
  );
  const records = sortRadioRecords(
    stations
      .map(normalizeStation)
      .filter((record): record is RadioStationRecord => Boolean(record))
      .filter((record) => record.point.countryCode === countryCode)
  );

  countryRecordCache.set(countryCode, {
    fetchedAt: now,
    records
  });

  return records;
}

function sortRadioRecords(records: RadioStationRecord[]) {
  return [...records].sort(compareRadioRecords);
}

function compareRadioRecords(a: RadioStationRecord, b: RadioStationRecord) {
  const voteDiff = b.votes - a.votes;

  if (voteDiff !== 0) {
    return voteDiff;
  }

  const clickDiff = b.clickCount - a.clickCount;

  if (clickDiff !== 0) {
    return clickDiff;
  }

  return a.point.name.localeCompare(b.point.name);
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
