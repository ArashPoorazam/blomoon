import { logger } from "@/lib/server/logging";
import { normalizeStation } from "./normalize";
import {
  fetchRadioBrowserHostJson,
  fetchRadioBrowserJsonWithOptions
} from "./provider";
import type { RadioBrowserStation, RadioStationRecord } from "./types";

export type RadioProviderPageRequest = {
  host?: string;
  limit: number;
  offset: number;
  params: Record<string, string>;
  path: string;
  timeoutMs?: number;
};

export async function fetchNormalizedRadioStationPage(
  request: RadioProviderPageRequest,
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
  const normalizedRecords = stations
    .map(normalizeStation)
    .filter((record): record is RadioStationRecord => Boolean(record));
  const records = normalizedRecords.filter(recordFilter);
  const droppedCount = stations.length - normalizedRecords.length;

  if (droppedCount > 0) {
    logger.warn("provider.radio.normalization_dropped", {
      context: {
        droppedCount,
        stationCount: stations.length
      },
      message: "Radio Browser stations were dropped during normalization"
    });
  }

  return {
    nextOffset: stations.length < request.limit ? null : request.offset + stations.length,
    records
  };
}
