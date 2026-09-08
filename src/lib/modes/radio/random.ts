import { normalizeStation } from "./normalize";
import { fetchRadioBrowserJsonWithOptions } from "./provider";
import { getRandomCatalogRecord, getRandomOffset } from "./randomSelection";
import { getLiveGlobalStationCount } from "./stationCounts";
import type { RadioBrowserStation, RadioStationRecord } from "./types";

const RANDOM_PROVIDER_PAGE_LIMIT = 5;
const RANDOM_PROVIDER_MAX_ATTEMPTS = 4;

export async function getLiveRandomRadioRecord({
  excludePointId
}: {
  excludePointId?: string | null;
} = {}) {
  const total = await getLiveGlobalStationCount();

  if (!total) {
    throw new Error("Radio Browser station count is unavailable");
  }

  for (let attempt = 0; attempt < RANDOM_PROVIDER_MAX_ATTEMPTS; attempt += 1) {
    const offset = getRandomOffset(Math.max(1, total - RANDOM_PROVIDER_PAGE_LIMIT + 1));
    const stations = await fetchRadioBrowserJsonWithOptions<RadioBrowserStation[]>("/json/stations/search", {
      hidebroken: "true",
      limit: String(RANDOM_PROVIDER_PAGE_LIMIT),
      offset: String(offset)
    }, {
      cache: "no-store"
    });
    const records = stations
      .map(normalizeStation)
      .filter((record): record is RadioStationRecord => Boolean(record));
    const record = getRandomCatalogRecord(records, { excludePointId });

    if (record && record.point.id !== excludePointId) {
      return record;
    }
  }

  throw new Error("Radio Browser returned no usable random station");
}
