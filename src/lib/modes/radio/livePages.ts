import { getAlphaCountryCode, getKnownCountries } from "@/lib/geo";
import {
  COUNTRY_COVERAGE_LIMIT,
  COUNTRY_MARKER_LIMIT,
  RADIO_PROVIDER_COUNTRY_COVERAGE_CONCURRENCY,
  RADIO_PROVIDER_COUNTRY_PAGE_LIMIT,
  RADIO_PROVIDER_CATALOG_TIMEOUT_MS,
  RADIO_PROVIDER_WORLD_PAGE_CONCURRENCY,
  RADIO_PROVIDER_WORLD_PAGE_LIMIT,
  RADIO_PROVIDER_WORLD_SCAN_LIMIT,
  STATION_CACHE_TTL_MS,
  WORLD_MARKER_LIMIT
} from "./config";
import { normalizeStation } from "./normalize";
import {
  fetchRadioBrowserHostJson,
  fetchRadioBrowserJsonWithOptions,
  getRadioBrowserHosts
} from "./provider";
import { logger } from "@/lib/server/logging";
import type {
  RadioBrowserStation,
  RadioStationRecord
} from "./types";

export type RadioCountryRecordPage = {
  nextOffset: number | null;
  records: RadioStationRecord[];
  total: number;
  totalKind: "exact" | "lowerBound";
};

type CountryQueryRecordCache = {
  countryCode: string;
  exhausted: boolean;
  fetchedAt: number;
  nextProviderOffset: number;
  query: string;
  recordsById: Map<string, RadioStationRecord>;
};

type ProviderPageRequest = {
  host?: string;
  limit: number;
  offset: number;
  params: Record<string, string>;
  path: string;
  timeoutMs?: number;
};

const countryQueryRecordCache = new Map<string, CountryQueryRecordCache>();

export async function getLiveWorldRecords() {
  return getLiveRecordsFromAvailableHost(getLiveWorldRecordsFromHost);
}

export async function getLiveTopVotedWorldRecords() {
  return getLiveRecordsFromAvailableHost(getLiveTopVotedWorldRecordsFromHost);
}

async function getLiveRecordsFromAvailableHost(
  loadRecords: (host: string) => Promise<RadioStationRecord[]>
) {
  const hosts = await getRadioBrowserHosts();
  let lastError: Error | null = null;

  for (const host of hosts) {
    try {
      const records = await loadRecords(host);

      if (records.length > 0) {
        return records;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Radio Browser request failed");
    }
  }

  throw lastError ?? new Error("Radio Browser request failed");
}

async function getLiveWorldRecordsFromHost(host: string) {
  const [worldRecords, countryCoverageRecords] = await Promise.all([
    getLiveTopVotedWorldRecordsFromHost(host),
    getLiveCountryCoverageRecordsFromHost(host)
  ]);
  const recordsById = new Map<string, RadioStationRecord>();

  [...worldRecords, ...countryCoverageRecords].forEach((record) => {
    recordsById.set(record.point.id, record);
  });

  return sortRadioRecords(Array.from(recordsById.values()));
}

async function getLiveTopVotedWorldRecordsFromHost(host: string) {
  const recordsById = new Map<string, RadioStationRecord>();
  let exhausted = false;
  let nextOffset = 0;

  while (recordsById.size < WORLD_MARKER_LIMIT && !exhausted && nextOffset < RADIO_PROVIDER_WORLD_SCAN_LIMIT) {
    const offsets = Array.from(
      { length: RADIO_PROVIDER_WORLD_PAGE_CONCURRENCY },
      (_, index) => nextOffset + index * RADIO_PROVIDER_WORLD_PAGE_LIMIT
    ).filter((offset) => offset < RADIO_PROVIDER_WORLD_SCAN_LIMIT);
    const pages = await mapWithConcurrency(offsets, RADIO_PROVIDER_WORLD_PAGE_CONCURRENCY, (offset) => (
      fetchNormalizedStationPage({
        host,
        limit: RADIO_PROVIDER_WORLD_PAGE_LIMIT,
        offset,
        params: {
          hidebroken: "true"
        },
        path: "/json/stations/topvote",
        timeoutMs: RADIO_PROVIDER_CATALOG_TIMEOUT_MS
      })
    ));

    pages.forEach((page) => {
      page.records.forEach((record) => {
        if (recordsById.size < WORLD_MARKER_LIMIT) {
          recordsById.set(record.point.id, record);
        }
      });

      if (page.nextOffset === null) {
        exhausted = true;
      }
    });
    nextOffset += RADIO_PROVIDER_WORLD_PAGE_LIMIT * RADIO_PROVIDER_WORLD_PAGE_CONCURRENCY;
  }

  return sortRadioRecords(Array.from(recordsById.values())).slice(0, WORLD_MARKER_LIMIT);
}

async function getLiveCountryCoverageRecordsFromHost(host: string) {
  const countries = getKnownCountries()
    .map((country) => ({
      alphaCode: getAlphaCountryCode(country.code),
      code: country.code
    }))
    .filter((country): country is { alphaCode: string; code: string } => Boolean(country.alphaCode));
  const countryRecords = await mapWithConcurrency(
    countries,
    RADIO_PROVIDER_COUNTRY_COVERAGE_CONCURRENCY,
    async (country) => {
      try {
        return await getLiveCountryCoverageRecordsForHost(host, country);
      } catch {
        return [];
      }
    }
  );

  return countryRecords.flat();
}

async function getLiveCountryCoverageRecordsForHost(
  host: string,
  {
    alphaCode,
    code
  }: {
    alphaCode: string;
    code: string;
  }
) {
  const recordsById = new Map<string, RadioStationRecord>();
  let exhausted = false;
  let nextOffset = 0;

  while (recordsById.size < COUNTRY_COVERAGE_LIMIT && !exhausted) {
    const page = await fetchNormalizedStationPage(
      {
        ...getCountryStationPageRequest({
          alphaCode,
          offset: nextOffset,
          query: ""
        }),
        host,
        timeoutMs: RADIO_PROVIDER_CATALOG_TIMEOUT_MS
      },
      (record) => record.point.countryCode === code
    );

    page.records.forEach((record) => {
      if (recordsById.size < COUNTRY_COVERAGE_LIMIT) {
        recordsById.set(record.point.id, record);
      }
    });

    if (page.nextOffset === null) {
      exhausted = true;
      break;
    }

    nextOffset = page.nextOffset;
  }

  return sortRadioRecords(Array.from(recordsById.values())).slice(0, COUNTRY_COVERAGE_LIMIT);
}

export async function getLiveCountryMarkerRecords(countryCode: string) {
  const page = await getLiveCountryRecordPage({
    countryCode,
    limit: COUNTRY_MARKER_LIMIT,
    offset: 0,
    query: ""
  });

  return page.records;
}

export async function getLiveCountryRecordPage({
  countryCode,
  limit,
  offset,
  query
}: {
  countryCode: string;
  limit: number;
  offset: number;
  query: string;
}): Promise<RadioCountryRecordPage> {
  const now = Date.now();
  const alphaCode = getAlphaCountryCode(countryCode);

  if (!alphaCode) {
    return {
      nextOffset: null,
      records: [],
      total: 0,
      totalKind: "exact"
    };
  }

  const cacheKey = getCountryQueryCacheKey({ countryCode, query });
  const cached = countryQueryRecordCache.get(cacheKey);
  const freshCache = cached && now - cached.fetchedAt < STATION_CACHE_TTL_MS
    ? cached
    : createCountryQueryRecordCache(countryCode, query);
  const targetCount = offset + limit + 1;

  try {
    await fillCountryQueryRecordCache({
      alphaCode,
      cache: freshCache,
      targetCount
    });
    countryQueryRecordCache.set(cacheKey, freshCache);

    return createCountryRecordPage(freshCache, limit, offset);
  } catch (error) {
    if (cached && cached.recordsById.size > offset) {
      return createCountryRecordPage(cached, limit, offset);
    }

    throw error;
  }
}

export function sortRadioRecords(records: RadioStationRecord[]) {
  return [...records].sort(compareRadioRecords);
}

export function compareRadioRecords(a: RadioStationRecord, b: RadioStationRecord) {
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

function normalizeStations(stations: RadioBrowserStation[]) {
  const normalized = stations.map(normalizeStation);
  const records = normalized.filter((record): record is RadioStationRecord => Boolean(record));
  const droppedCount = stations.length - records.length;

  if (droppedCount > 0) {
    logger.warn("provider.radio.normalization_dropped", {
      context: {
        droppedCount,
        stationCount: stations.length
      },
      message: "Radio Browser stations were dropped during normalization"
    });
  }

  return records;
}

async function fillCountryQueryRecordCache({
  alphaCode,
  cache,
  targetCount
}: {
  alphaCode: string;
  cache: CountryQueryRecordCache;
  targetCount: number;
}) {
  while (cache.recordsById.size < targetCount && !cache.exhausted) {
    const page = await fetchNormalizedStationPage(
      getCountryStationPageRequest({
        alphaCode,
        offset: cache.nextProviderOffset,
        query: cache.query
      }),
      (record) => record.point.countryCode === cache.countryCode
    );

    page.records.forEach((record) => {
      cache.recordsById.set(record.point.id, record);
    });
    cache.fetchedAt = Date.now();

    if (page.nextOffset === null) {
      cache.exhausted = true;
      break;
    }

    cache.nextProviderOffset = page.nextOffset;
  }
}

async function fetchNormalizedStationPage(
  request: ProviderPageRequest,
  recordFilter: (record: RadioStationRecord) => boolean = () => true
) {
  const params = {
    ...request.params,
    limit: String(request.limit),
    offset: String(request.offset)
  };
  const stations = request.host
    ? await fetchRadioBrowserHostJson<RadioBrowserStation[]>(request.host, request.path, params, {
      timeoutMs: request.timeoutMs
    })
    : await fetchRadioBrowserJsonWithOptions<RadioBrowserStation[]>(request.path, params, {
      timeoutMs: request.timeoutMs
    });
  const records = normalizeStations(stations).filter(recordFilter);

  return {
    nextOffset: stations.length < request.limit ? null : request.offset + stations.length,
    records
  };
}

function getCountryStationPageRequest({
  alphaCode,
  offset,
  query
}: {
  alphaCode: string;
  offset: number;
  query: string;
}): ProviderPageRequest {
  const trimmedQuery = query.trim();
  const params = getOrderedStationParams();

  if (!trimmedQuery) {
    return {
      limit: RADIO_PROVIDER_COUNTRY_PAGE_LIMIT,
      offset,
      params,
      path: `/json/stations/bycountrycodeexact/${encodeURIComponent(alphaCode.toLowerCase())}`
    };
  }

  return {
    limit: RADIO_PROVIDER_COUNTRY_PAGE_LIMIT,
    offset,
    params: {
      ...params,
      countrycode: alphaCode.toLowerCase(),
      name: trimmedQuery
    },
    path: "/json/stations/search"
  };
}

function createCountryRecordPage(
  cache: CountryQueryRecordCache,
  limit: number,
  offset: number
): RadioCountryRecordPage {
  const records = sortRadioRecords(Array.from(cache.recordsById.values()));
  const nextOffset = records.length > offset + limit
    ? offset + limit
    : null;
  const pageRecords = records.slice(offset, offset + limit);

  return {
    nextOffset,
    records: pageRecords,
    total: cache.exhausted ? records.length : Math.max(records.length, offset + pageRecords.length),
    totalKind: cache.exhausted ? "exact" : "lowerBound"
  };
}

function createCountryQueryRecordCache(countryCode: string, query: string): CountryQueryRecordCache {
  return {
    countryCode,
    exhausted: false,
    fetchedAt: 0,
    nextProviderOffset: 0,
    query: query.trim(),
    recordsById: new Map()
  };
}

function getOrderedStationParams() {
  return {
    hidebroken: "true",
    order: "votes",
    reverse: "true"
  };
}

function getCountryQueryCacheKey({
  countryCode,
  query
}: {
  countryCode: string;
  query: string;
}) {
  return `${countryCode}:${query.trim().toLowerCase()}`;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
