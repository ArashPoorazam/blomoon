import type { TerraDataset } from "../types";
import {
  FALLBACK_CACHE_TTL_MS,
  RADIO_STARTUP_SOFT_TIMEOUT_MS,
  STATION_CACHE_TTL_MS
} from "./config";
import { getLiveTopVotedWorldRecords, getLiveWorldRecords, sortRadioRecords } from "./livePages";
import { createRadioLiveSource } from "./source";
import { getRadioFixtureDataset } from "./catalog";
import { logger } from "@/lib/server/logging";
import type { RadioStationRecord } from "./types";

type StartupDatasetCache = {
  coverageComplete: boolean;
  dataset: TerraDataset;
  fetchedAt: number;
  isFallback: boolean;
};

export type RadioStartupDatasetOptions = {
  loadCoveredRecords?: () => Promise<RadioStationRecord[]>;
  loadRecords?: () => Promise<RadioStationRecord[]>;
  now?: () => number;
  scheduleRefresh?: (refresh: () => Promise<void>) => void;
  softTimeoutMs?: number;
};

let startupCache: StartupDatasetCache | null = null;
let startupRefresh: Promise<TerraDataset> | null = null;
let coverageRefresh: Promise<TerraDataset> | null = null;

export async function getRadioStartupDataset(options: RadioStartupDatasetOptions = {}): Promise<TerraDataset> {
  const now = options.now ?? Date.now;
  const cached = startupCache;

  if (cached && now() - cached.fetchedAt < getCacheTtl(cached)) {
    if (!cached.coverageComplete) {
      scheduleCoverageRefresh(options);
    }

    return cached.dataset;
  }

  if (cached) {
    scheduleCoverageRefresh(options);
    return cached.dataset;
  }

  const refresh = getStartupRefresh(options);
  const dataset = await resolveBeforeTimeout(refresh, options.softTimeoutMs ?? RADIO_STARTUP_SOFT_TIMEOUT_MS);

  if (dataset) {
    scheduleCoverageRefresh(options);
    return dataset;
  }

  scheduleSettledCoverageRefresh(refresh, options);
  return getRadioFixtureDataset();
}

export async function refreshRadioStartupDataset(options: RadioStartupDatasetOptions = {}): Promise<TerraDataset> {
  return getStartupRefresh(options);
}

export function clearRadioStartupDatasetCacheForTest() {
  startupCache = null;
  startupRefresh = null;
  coverageRefresh = null;
}

async function loadRadioStartupDataset({
  loadRecords = getLiveTopVotedWorldRecords,
  now = Date.now
}: RadioStartupDatasetOptions = {}) {
  try {
    const records = await loadRecords();

    if (records.length === 0) {
      throw new Error("Radio Browser returned no usable startup stations");
    }

    const dataset = createStartupDataset(records);
    startupCache = {
      coverageComplete: false,
      dataset,
      fetchedAt: now(),
      isFallback: false
    };
    logger.info("radio.startup.refresh", {
      context: {
        records: records.length,
        startupPoints: dataset.points.length
      },
      message: "Radio startup dataset refreshed from live provider"
    });
    return dataset;
  } catch (error) {
    logger.warn("radio.startup.refresh_fallback", {
      error,
      message: "Radio startup dataset refresh failed; using cached or fixture data"
    });

    if (startupCache) {
      return startupCache.dataset;
    }

    const dataset = getRadioFixtureDataset();
    startupCache = {
      coverageComplete: false,
      dataset,
      fetchedAt: now(),
      isFallback: true
    };
    return dataset;
  }
}

async function loadRadioStartupCoverageDataset({
  loadCoveredRecords = getLiveWorldRecords,
  now = Date.now
}: RadioStartupDatasetOptions = {}) {
  try {
    const records = await loadCoveredRecords();

    if (records.length === 0) {
      throw new Error("Radio Browser returned no usable country coverage stations");
    }

    const dataset = createStartupDataset(records);
    startupCache = {
      coverageComplete: true,
      dataset,
      fetchedAt: now(),
      isFallback: false
    };
    logger.info("radio.startup.coverage_refresh", {
      context: {
        records: records.length,
        startupPoints: dataset.points.length
      },
      message: "Radio startup dataset refreshed with country coverage"
    });
    return dataset;
  } catch (error) {
    logger.warn("radio.startup.coverage_refresh_failed", {
      error,
      message: "Radio startup country coverage refresh failed; keeping current startup data"
    });

    if (startupCache) {
      return startupCache.dataset;
    }

    const dataset = getRadioFixtureDataset();
    startupCache = {
      coverageComplete: false,
      dataset,
      fetchedAt: now(),
      isFallback: true
    };
    return dataset;
  }
}

function createStartupDataset(records: RadioStationRecord[]): TerraDataset {
  const recordsById = new Map<string, RadioStationRecord>();

  records.forEach((record) => {
    recordsById.set(record.point.id, record);
  });

  return {
    modeId: "radio",
    source: createRadioLiveSource(),
    points: sortRadioRecords(Array.from(recordsById.values())).map((record) => record.point)
  };
}

function getStartupRefresh(options: RadioStartupDatasetOptions) {
  if (!startupRefresh) {
    startupRefresh = loadRadioStartupDataset(options)
      .finally(() => {
        startupRefresh = null;
      });
  }

  return startupRefresh;
}

function getCoverageRefresh(options: RadioStartupDatasetOptions) {
  if (!coverageRefresh) {
    coverageRefresh = loadRadioStartupCoverageDataset(options)
      .finally(() => {
        coverageRefresh = null;
      });
  }

  return coverageRefresh;
}

function scheduleCoverageRefresh(options: RadioStartupDatasetOptions) {
  const scheduleRefresh = options.scheduleRefresh;

  if (!scheduleRefresh || coverageRefresh) {
    return;
  }

  scheduleRefresh(async () => {
    await getCoverageRefresh(options);
  });
}

function scheduleSettledCoverageRefresh(
  refresh: Promise<TerraDataset>,
  options: RadioStartupDatasetOptions
) {
  options.scheduleRefresh?.(async () => {
    await refresh;
    await getCoverageRefresh(options);
  });
}

async function resolveBeforeTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function getCacheTtl(cache: StartupDatasetCache) {
  return cache.isFallback || cache.dataset.source.isFallback
    ? FALLBACK_CACHE_TTL_MS
    : STATION_CACHE_TTL_MS;
}
