import { getAlphaCountryCode, getKnownCountries } from "@/lib/geo";
import { logger } from "@/lib/server/logging";
import {
  COUNTRY_COVERAGE_LIMIT,
  RADIO_PROVIDER_CATALOG_TIMEOUT_MS,
  RADIO_PROVIDER_COUNTRY_COVERAGE_CONCURRENCY,
  RADIO_PROVIDER_COUNTRY_PAGE_LIMIT
} from "./config";
import {
  getLastHealthyRadioBrowserHost,
  getRadioBrowserHosts
} from "./provider";
import { getLiveCountryStationCounts } from "./stationCounts";
import { fetchNormalizedRadioStationPage } from "./stationPages";
import type { RadioStationRecord } from "./types";

type CoverageCountry = {
  alphaCode: string;
  code: string;
  records: RadioStationRecord[];
  targetCount: number;
};

export async function getLiveCountryCoverageRecords(topRecords: RadioStationRecord[]) {
  const host = await getCoverageHost();
  return getLiveCountryCoverageRecordsFromHost(host, topRecords);
}

export async function getLiveCountryCoverageRecordsFromHost(
  host: string,
  topRecords: RadioStationRecord[]
) {
  const countsByAlphaCode = await getLiveCountryStationCounts();
  const topRecordsByCountry = groupRecordsByCountry(topRecords);
  const countries = getKnownCountries()
    .map((country) => ({
      alphaCode: getAlphaCountryCode(country.code),
      code: country.code,
      records: topRecordsByCountry.get(country.code) ?? []
    }))
    .filter((country): country is Omit<CoverageCountry, "targetCount"> => Boolean(country.alphaCode))
    .map((country) => ({
      ...country,
      targetCount: Math.min(COUNTRY_COVERAGE_LIMIT, countsByAlphaCode.get(country.alphaCode) ?? 0)
    }))
    .filter((country) => country.records.length < country.targetCount);
  const countryResults = await mapWithConcurrency(
    countries,
    RADIO_PROVIDER_COUNTRY_COVERAGE_CONCURRENCY,
    async (country) => {
      try {
        return {
          records: await loadCountryDeficit(host, country),
          succeeded: true
        };
      } catch {
        return {
          records: country.records,
          succeeded: false
        };
      }
    }
  );
  const succeeded = countryResults.filter((result) => result.succeeded).length;

  logger.info("provider.radio.coverage_completed", {
    context: {
      attempted: countries.length,
      failed: countries.length - succeeded,
      host,
      succeeded
    },
    message: "Radio country coverage run completed"
  });

  return countryResults.flatMap((result) => result.records);
}

async function loadCountryDeficit(host: string, country: CoverageCountry) {
  const recordsById = new Map(country.records.map((record) => [record.point.id, record]));
  let nextOffset = 0;

  while (recordsById.size < country.targetCount) {
    const page = await fetchNormalizedRadioStationPage(
      {
        host,
        limit: RADIO_PROVIDER_COUNTRY_PAGE_LIMIT,
        offset: nextOffset,
        params: {
          hidebroken: "true",
          order: "votes",
          reverse: "true"
        },
        path: `/json/stations/bycountrycodeexact/${encodeURIComponent(country.alphaCode.toLowerCase())}`,
        timeoutMs: RADIO_PROVIDER_CATALOG_TIMEOUT_MS
      },
      (record) => record.point.countryCode === country.code
    );

    page.records.forEach((record) => {
      if (recordsById.size < country.targetCount) {
        recordsById.set(record.point.id, record);
      }
    });

    if (page.nextOffset === null) {
      break;
    }

    nextOffset = page.nextOffset;
  }

  return Array.from(recordsById.values()).slice(0, country.targetCount);
}

async function getCoverageHost() {
  const hosts = await getRadioBrowserHosts();
  const healthyHost = getLastHealthyRadioBrowserHost();

  if (healthyHost && hosts.includes(healthyHost)) {
    return healthyHost;
  }

  const host = hosts[0];

  if (!host) {
    throw new Error("Radio Browser has no available coverage host");
  }

  return host;
}

function groupRecordsByCountry(records: RadioStationRecord[]) {
  const recordsByCountry = new Map<string, RadioStationRecord[]>();

  records.forEach((record) => {
    const countryRecords = recordsByCountry.get(record.point.countryCode) ?? [];
    countryRecords.push(record);
    recordsByCountry.set(record.point.countryCode, countryRecords);
  });

  return recordsByCountry;
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
