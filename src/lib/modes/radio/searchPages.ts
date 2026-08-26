import { getAlphaCountryCode, getKnownCountries } from "@/lib/geo";
import type { RadioSortOption } from "./api";
import { RADIO_PROVIDER_COUNTRY_PAGE_LIMIT, STATION_CACHE_TTL_MS } from "./config";
import { normalizeStation } from "./normalize";
import { fetchRadioBrowserJsonWithOptions } from "./provider";
import type { RadioCountryRecordPage } from "./livePages";
import type {
  RadioBrowserCountRecord,
  RadioBrowserLanguage,
  RadioBrowserStation,
  RadioBrowserStats,
  RadioBrowserTag,
  RadioStationRecord
} from "./types";

export type RadioListQuery = {
  countryCode: string | null;
  query: string;
  sort: RadioSortOption;
};

type RadioListRecordCache = {
  exhausted: boolean;
  fetchedAt: number;
  nextProviderOffset: number;
  query: RadioListQuery;
  recordsById: Map<string, RadioStationRecord>;
  total: number | null;
};

type RadioSearchVocab = {
  countriesByToken: Map<string, string>;
  languagesByToken: Map<string, string>;
  tagsByToken: Map<string, string>;
};

type ParsedRadioSearch = {
  countryCode: string | null;
  language: string | null;
  nameTerms: string[];
  tags: string[];
};

type ProviderPageRequest = {
  limit: number;
  offset: number;
  params: Record<string, string>;
  path: string;
};

const radioListRecordCache = new Map<string, RadioListRecordCache>();
let radioSearchVocabCache: { fetchedAt: number; vocab: RadioSearchVocab } | null = null;
let radioSearchVocabRefresh: Promise<RadioSearchVocab> | null = null;
let countryCountCache: { countsByCode: Map<string, number>; fetchedAt: number } | null = null;
let globalStationCountCache: { count: number; fetchedAt: number } | null = null;

export async function getLiveRadioRecordPage({
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
}): Promise<RadioCountryRecordPage> {
  const now = Date.now();
  const listQuery = {
    countryCode,
    query: query.trim(),
    sort
  };
  const cacheKey = getRadioListQueryCacheKey(listQuery);
  const cached = radioListRecordCache.get(cacheKey);
  const freshCache = cached && now - cached.fetchedAt < STATION_CACHE_TTL_MS
    ? cached
    : createRadioListRecordCache(listQuery);
  const targetCount = offset + limit + 1;

  try {
    await fillRadioListRecordCache({
      cache: freshCache,
      targetCount
    });
    radioListRecordCache.set(cacheKey, freshCache);

    return createRadioRecordPage(freshCache, limit, offset);
  } catch (error) {
    if (cached && cached.recordsById.size > offset) {
      return createRadioRecordPage(cached, limit, offset);
    }

    throw error;
  }
}

async function fillRadioListRecordCache({
  cache,
  targetCount
}: {
  cache: RadioListRecordCache;
  targetCount: number;
}) {
  const vocab = cache.query.query ? await getRadioSearchVocab() : null;
  const parsedSearch = parseRadioSearch(cache.query, vocab);
  const countryCode = cache.query.countryCode ?? parsedSearch.countryCode;
  const alphaCode = countryCode ? getAlphaCountryCode(countryCode) : null;

  if (countryCode && !alphaCode) {
    cache.exhausted = true;
    cache.total = 0;
    cache.fetchedAt = Date.now();
    return;
  }

  if (!cache.query.query && cache.total === null) {
    cache.total = alphaCode
      ? await getLiveCountryStationCount(alphaCode)
      : await getLiveGlobalStationCount();
  }

  while (cache.recordsById.size < targetCount && !cache.exhausted) {
    const page = await fetchNormalizedStationPage(
      getRadioListPageRequest({
        alphaCode,
        offset: cache.nextProviderOffset,
        parsedSearch,
        sort: cache.query.sort
      }),
      (record) => (
        (!countryCode || record.point.countryCode === countryCode) &&
        matchesParsedRadioSearch(record, parsedSearch)
      )
    );

    page.records.forEach((record) => {
      cache.recordsById.set(record.point.id, record);
    });
    cache.fetchedAt = Date.now();

    if (page.nextOffset === null) {
      cache.exhausted = true;
      cache.total = cache.recordsById.size;
      break;
    }

    cache.nextProviderOffset = page.nextOffset;
  }
}

async function fetchNormalizedStationPage(
  request: ProviderPageRequest,
  recordFilter: (record: RadioStationRecord) => boolean = () => true
) {
  const stations = await fetchRadioBrowserJsonWithOptions<RadioBrowserStation[]>(request.path, {
    ...request.params,
    limit: String(request.limit),
    offset: String(request.offset)
  });
  const records = stations
    .map(normalizeStation)
    .filter((record): record is RadioStationRecord => Boolean(record))
    .filter(recordFilter);

  return {
    nextOffset: stations.length < request.limit ? null : request.offset + stations.length,
    records
  };
}

function getRadioListPageRequest({
  alphaCode,
  offset,
  parsedSearch,
  sort
}: {
  alphaCode: string | null;
  offset: number;
  parsedSearch: ParsedRadioSearch;
  sort: RadioSortOption;
}): ProviderPageRequest {
  const params = getOrderedStationParams(sort);
  const searchParams = {
    ...params,
    ...(alphaCode ? { countrycode: alphaCode.toLowerCase() } : {}),
    ...(parsedSearch.language ? { language: parsedSearch.language } : {}),
    ...(parsedSearch.tags.length > 0 ? { tagList: parsedSearch.tags.join(",") } : {}),
    ...(parsedSearch.nameTerms.length > 0 ? { name: parsedSearch.nameTerms.join(" ") } : {})
  };
  const baseParamKeys = new Set(Object.keys(params));
  const hasSearchParams = Object.keys(searchParams).some((key) => !baseParamKeys.has(key));

  return {
    limit: RADIO_PROVIDER_COUNTRY_PAGE_LIMIT,
    offset,
    params: searchParams,
    path: hasSearchParams ? "/json/stations/search" : "/json/stations"
  };
}

function createRadioRecordPage(
  cache: RadioListRecordCache,
  limit: number,
  offset: number
): RadioCountryRecordPage {
  const records = sortRecords(Array.from(cache.recordsById.values()), cache.query.sort);
  const hasFetchedLookahead = records.length > offset + limit;
  const hasKnownRemaining = cache.total !== null && cache.total > offset + limit;
  const pageRecords = records.slice(offset, offset + limit);

  return {
    nextOffset: hasFetchedLookahead || hasKnownRemaining ? offset + limit : null,
    records: pageRecords,
    total: cache.total ?? Math.max(records.length, offset + pageRecords.length),
    totalKind: cache.total !== null ? "exact" : "lowerBound"
  };
}

function createRadioListRecordCache(query: RadioListQuery): RadioListRecordCache {
  return {
    exhausted: false,
    fetchedAt: 0,
    nextProviderOffset: 0,
    query,
    recordsById: new Map(),
    total: null
  };
}

function getOrderedStationParams(sort: RadioSortOption) {
  return {
    hidebroken: "true",
    order: "votes",
    reverse: sort === "votes_desc" ? "true" : "false"
  };
}

function getRadioListQueryCacheKey(query: RadioListQuery) {
  return [
    query.countryCode ?? "world",
    query.sort,
    query.query.trim().toLowerCase()
  ].join(":");
}

async function getRadioSearchVocab() {
  const now = Date.now();

  if (radioSearchVocabCache && now - radioSearchVocabCache.fetchedAt < STATION_CACHE_TTL_MS) {
    return radioSearchVocabCache.vocab;
  }

  if (radioSearchVocabRefresh) {
    return radioSearchVocabRefresh;
  }

  radioSearchVocabRefresh = refreshRadioSearchVocab()
    .finally(() => {
      radioSearchVocabRefresh = null;
    });

  return radioSearchVocabRefresh;
}

async function refreshRadioSearchVocab() {
  const [languages, tags] = await Promise.all([
    fetchRadioBrowserJsonWithOptions<RadioBrowserLanguage[]>("/json/languages", {
      hidebroken: "true",
      limit: "2000",
      order: "stationcount",
      reverse: "true"
    }),
    fetchRadioBrowserJsonWithOptions<RadioBrowserTag[]>("/json/tags", {
      hidebroken: "true",
      limit: "2000",
      order: "stationcount",
      reverse: "true"
    })
  ]);
  const vocab: RadioSearchVocab = {
    countriesByToken: createCountryTokenMap(),
    languagesByToken: createNamedTokenMap(languages),
    tagsByToken: createNamedTokenMap(tags)
  };

  radioSearchVocabCache = {
    fetchedAt: Date.now(),
    vocab
  };

  return vocab;
}

function parseRadioSearch(query: RadioListQuery, vocab: RadioSearchVocab | null): ParsedRadioSearch {
  const nameTerms: string[] = [];
  const tags: string[] = [];
  let countryCode: string | null = null;
  let language: string | null = null;

  normalizeSearchTokens(query.query).forEach((token) => {
    const tokenCountryCode = vocab?.countriesByToken.get(token) ?? null;
    const tokenLanguage = vocab?.languagesByToken.get(token) ?? null;
    const tokenTag = vocab?.tagsByToken.get(token) ?? null;

    if (!countryCode && !query.countryCode && tokenCountryCode) {
      countryCode = tokenCountryCode;
      return;
    }

    if (!language && tokenLanguage) {
      language = tokenLanguage;
      return;
    }

    if (tokenTag) {
      tags.push(tokenTag);
      return;
    }

    nameTerms.push(token);
  });

  return {
    countryCode,
    language,
    nameTerms,
    tags
  };
}

function matchesParsedRadioSearch(record: RadioStationRecord, parsedSearch: ParsedRadioSearch) {
  return parsedSearch.nameTerms.every((term) => record.searchText.includes(term));
}

async function getLiveCountryStationCount(alphaCode: string) {
  const now = Date.now();

  if (countryCountCache && now - countryCountCache.fetchedAt < STATION_CACHE_TTL_MS) {
    return countryCountCache.countsByCode.get(alphaCode.toUpperCase()) ?? null;
  }

  const countries = await fetchRadioBrowserJsonWithOptions<RadioBrowserCountRecord[]>("/json/countrycodes", {
    hidebroken: "true"
  });
  const countsByCode = new Map<string, number>();

  countries.forEach((country) => {
    const code = (country.iso_3166_1 ?? country.name)?.trim().toUpperCase();
    const count = parseCount(country.stationcount);

    if (code && count !== null) {
      countsByCode.set(code, count);
    }
  });
  countryCountCache = {
    countsByCode,
    fetchedAt: now
  };

  return countsByCode.get(alphaCode.toUpperCase()) ?? null;
}

export async function getLiveGlobalStationCount() {
  const now = Date.now();

  if (globalStationCountCache && now - globalStationCountCache.fetchedAt < STATION_CACHE_TTL_MS) {
    return globalStationCountCache.count;
  }

  const stats = await fetchRadioBrowserJsonWithOptions<RadioBrowserStats>("/json/stats");
  const stations = parseCount(stats.stations);
  const brokenStations = parseCount(stats.stations_broken) ?? 0;

  if (stations === null) {
    return null;
  }

  globalStationCountCache = {
    count: Math.max(0, stations - brokenStations),
    fetchedAt: now
  };

  return globalStationCountCache.count;
}

function createCountryTokenMap() {
  const countries = new Map<string, string>();

  getKnownCountries().forEach((country) => {
    normalizeSearchTokens(country.name).forEach((token) => {
      countries.set(token, country.code);
    });
  });

  return countries;
}

function createNamedTokenMap(records: Array<{ name?: string }>) {
  const values = new Map<string, string>();

  records.forEach((record) => {
    const name = record.name?.trim();

    if (!name) {
      return;
    }

    setFirstTokenMatch(values, normalizeSearchValue(name), name);
    normalizeSearchTokens(name).forEach((token) => {
      setFirstTokenMatch(values, token, name);
    });
  });

  return values;
}

function setFirstTokenMatch(values: Map<string, string>, token: string, value: string) {
  if (!values.has(token)) {
    values.set(token, value);
  }
}

function normalizeSearchTokens(value: string) {
  return normalizeSearchValue(value)
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function sortRecords(records: RadioStationRecord[], sort: RadioSortOption) {
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

function parseCount(value?: number | string) {
  const count = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
  return Number.isFinite(count) ? count : null;
}
