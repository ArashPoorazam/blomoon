import { STATION_CACHE_TTL_MS } from "./config";
import { fetchRadioBrowserJsonWithOptions } from "./provider";
import type { RadioBrowserCountRecord, RadioBrowserStats } from "./types";

let countryCountCache: { countsByCode: Map<string, number>; fetchedAt: number } | null = null;
let countryCountRefresh: Promise<Map<string, number>> | null = null;
let globalStationCountCache: { count: number | null; fetchedAt: number } | null = null;
let globalStationCountRefresh: Promise<number | null> | null = null;

export async function getLiveCountryStationCounts() {
  const now = Date.now();

  if (countryCountCache && now - countryCountCache.fetchedAt < STATION_CACHE_TTL_MS) {
    return countryCountCache.countsByCode;
  }

  if (!countryCountRefresh) {
    countryCountRefresh = refreshCountryStationCounts(now)
      .finally(() => {
        countryCountRefresh = null;
      });
  }

  return countryCountRefresh;
}

export async function getLiveGlobalStationCount() {
  const now = Date.now();

  if (globalStationCountCache && now - globalStationCountCache.fetchedAt < STATION_CACHE_TTL_MS) {
    return globalStationCountCache.count;
  }

  if (!globalStationCountRefresh) {
    globalStationCountRefresh = refreshGlobalStationCount(now)
      .finally(() => {
        globalStationCountRefresh = null;
      });
  }

  return globalStationCountRefresh;
}

export function createCountryStationCountIndex(countries: RadioBrowserCountRecord[]) {
  const countsByCode = new Map<string, number>();

  countries.forEach((country) => {
    const code = normalizeProviderCountryCountCode(country);
    const count = parseCount(country.stationcount);

    if (!code || count === null) {
      return;
    }

    countsByCode.set(code, Math.max(countsByCode.get(code) ?? 0, count));
  });

  return countsByCode;
}

export function clearRadioStationCountCacheForTest() {
  countryCountCache = null;
  countryCountRefresh = null;
  globalStationCountCache = null;
  globalStationCountRefresh = null;
}

async function refreshCountryStationCounts(fetchedAt: number) {
  const countries = await fetchRadioBrowserJsonWithOptions<RadioBrowserCountRecord[]>("/json/countrycodes", {
    hidebroken: "true"
  });
  const countsByCode = createCountryStationCountIndex(countries);

  countryCountCache = {
    countsByCode,
    fetchedAt
  };
  return countsByCode;
}

async function refreshGlobalStationCount(fetchedAt: number) {
  const stats = await fetchRadioBrowserJsonWithOptions<RadioBrowserStats>("/json/stats");
  const stations = parseCount(stats.stations);
  const brokenStations = parseCount(stats.stations_broken) ?? 0;
  const count = stations === null ? null : Math.max(0, stations - brokenStations);

  globalStationCountCache = {
    count,
    fetchedAt
  };
  return count;
}

function parseCount(value?: number | string) {
  const count = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
  return Number.isFinite(count) ? count : null;
}

function normalizeProviderCountryCountCode(country: RadioBrowserCountRecord) {
  const candidates = [country.iso_3166_1, country.name];
  const code = candidates
    .map((value) => value?.trim().toUpperCase() ?? "")
    .find((value) => /^[A-Z]{2}$/.test(value));

  return code ?? null;
}
