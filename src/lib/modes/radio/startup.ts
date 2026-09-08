import type { TerraDataset } from "../types";
import {
  FALLBACK_CACHE_TTL_MS,
  RADIO_STARTUP_SOFT_TIMEOUT_MS,
  STATION_CACHE_TTL_MS
} from "./config";
import { getLiveTopVotedWorldRecords, getLiveWorldRecords, sortRadioRecords } from "./livePages";
import { createRadioLiveSource } from "./source";
import { getRadioFixtureDataset, getRadioFixtureRecords } from "./catalog";
import { logger } from "@/lib/server/logging";
import type { RadioStationRecord } from "./types";
import { canonicalizeRadioRecords } from "./stationIdentity";
import { canonicalizeAvailableRecords } from "./identityStore";

type StartupDatasetCache = {
  coverageAttemptedAt: number | null;
  dataset: TerraDataset;
  isFallback: boolean;
  records: RadioStationRecord[];
  topAttemptedAt: number;
};

export type RadioStartupDatasetOptions = {
  loadCoveredRecords?: (topRecords: RadioStationRecord[]) => Promise<RadioStationRecord[]>;
  loadRecords?: () => Promise<RadioStationRecord[]>;
  now?: () => number;
  scheduleRefresh?: (refresh: () => Promise<void>) => void;
  softTimeoutMs?: number;
};

let startupCache: StartupDatasetCache | null = null;
let startupRefresh: Promise<TerraDataset> | null = null;
let coverageRefresh: Promise<TerraDataset> | null = null;
let backgroundRefreshScheduled = false;

export async function getRadioStartupDataset(options: RadioStartupDatasetOptions = {}): Promise<TerraDataset> {
  const now = options.now ?? Date.now;
  const cached = startupCache;

  if (cached) {
    if (now() - cached.topAttemptedAt >= getCacheTtl(cached)) {
      scheduleStartupRefresh(options);
    } else if (cached.coverageAttemptedAt === null || now() - cached.coverageAttemptedAt >= STATION_CACHE_TTL_MS) {
      scheduleCoverageRefresh(options);
    }

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
  backgroundRefreshScheduled = false;
}

async function loadRadioStartupDataset({
  loadRecords = getLiveTopVotedWorldRecords,
  now = Date.now
}: RadioStartupDatasetOptions = {}) {
  try {
    const records = await canonicalizeAvailableRecords(await loadRecords());

    if (records.length === 0) {
      throw new Error("Radio Browser returned no usable startup stations");
    }

    const dataset = createStartupDataset(records);
    startupCache = {
      coverageAttemptedAt: null,
      dataset,
      isFallback: false,
      records,
      topAttemptedAt: now()
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
      startupCache.topAttemptedAt = now();
      return startupCache.dataset;
    }

    const dataset = getRadioFixtureDataset();
    startupCache = {
      coverageAttemptedAt: null,
      dataset,
      isFallback: true,
      records: getRadioFixtureRecords(),
      topAttemptedAt: now()
    };
    return dataset;
  }
}

async function loadRadioStartupCoverageDataset({
  loadCoveredRecords = getLiveWorldRecords,
  now = Date.now
}: RadioStartupDatasetOptions = {}) {
  const cached = startupCache;

  if (!cached) {
    return getRadioFixtureDataset();
  }

  const attemptedAt = now();
  cached.coverageAttemptedAt = attemptedAt;

  try {
    const records = await canonicalizeAvailableRecords(await loadCoveredRecords(cached.records));

    if (records.length === 0) {
      throw new Error("Radio Browser returned no usable country coverage stations");
    }

    const dataset = createStartupDataset(records);
    startupCache = {
      coverageAttemptedAt: attemptedAt,
      dataset,
      isFallback: false,
      records,
      topAttemptedAt: cached.topAttemptedAt
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

    return startupCache?.dataset ?? cached.dataset;
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
    points: sortRadioRecords(canonicalizeRadioRecords(Array.from(recordsById.values())).records).map((record) => record.point)
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
  if (coverageRefresh) {
    return;
  }

  scheduleBackgroundRefresh(options, async () => {
    await getCoverageRefresh(options);
  });
}

function scheduleStartupRefresh(options: RadioStartupDatasetOptions) {
  if (startupRefresh) {
    return;
  }

  scheduleBackgroundRefresh(options, async () => {
    await getStartupRefresh(options);
    await getCoverageRefresh(options);
  });
}

function scheduleSettledCoverageRefresh(
  refresh: Promise<TerraDataset>,
  options: RadioStartupDatasetOptions
) {
  scheduleBackgroundRefresh(options, async () => {
    await refresh;
    await getCoverageRefresh(options);
  });
}

function scheduleBackgroundRefresh(
  options: RadioStartupDatasetOptions,
  refresh: () => Promise<void>
) {
  if (!options.scheduleRefresh || backgroundRefreshScheduled) {
    return;
  }

  backgroundRefreshScheduled = true;
  options.scheduleRefresh(async () => {
    try {
      await refresh();
    } finally {
      backgroundRefreshScheduled = false;
    }
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
