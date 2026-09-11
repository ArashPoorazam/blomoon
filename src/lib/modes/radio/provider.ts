import {
  FALLBACK_CACHE_TTL_MS,
  RADIO_BROWSER_DIRECTORY_URL,
  RADIO_BROWSER_FALLBACK_HOSTS,
  RADIO_BROWSER_USER_AGENT,
  REQUEST_TIMEOUT_MS,
  STATION_CACHE_TTL_MS
} from "./config";
import { logger } from "@/lib/server/logging";
import type { RadioBrowserServer } from "./types";

type RadioBrowserJsonOptions = {
  cache?: RequestCache;
  timeoutMs?: number;
  signal?: AbortSignal;
};

let serverCache: {
  hosts: string[];
  refreshAfter: number;
} | null = null;
let serverRefresh: Promise<string[]> | null = null;
let lastHealthyHost: string | null = null;

export async function fetchRadioBrowserJson<T>(path: string, params?: Record<string, string>): Promise<T> {
  return fetchRadioBrowserJsonWithOptions(path, params);
}

export async function fetchRadioBrowserJsonWithOptions<T>(
  path: string,
  params?: Record<string, string>,
  options: RadioBrowserJsonOptions = {}
): Promise<T> {
  options.signal?.throwIfAborted();
  const hosts = options.signal
    ? [...new Set([lastHealthyHost, ...(serverCache?.hosts ?? RADIO_BROWSER_FALLBACK_HOSTS)].filter((host): host is string => Boolean(host)))]
    : await getRadioBrowserHosts();
  let lastError: Error | null = null;

  for (const host of hosts) {
    options.signal?.throwIfAborted();
    try {
      return await fetchRadioBrowserHostJson<T>(host, path, params, options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Radio Browser request failed");
      logger.warn("provider.radio.host_failed", {
        context: {
          host,
          path
        },
        error: lastError,
        message: "Radio Browser host request failed"
      });
    }
  }

  logger.error("provider.radio.request_failed", {
    context: {
      hostCount: hosts.length,
      path
    },
    error: lastError,
    message: "Radio Browser request failed for all hosts"
  });
  throw lastError ?? new Error("Radio Browser request failed");
}

export async function fetchRadioBrowserHostJson<T>(
  host: string,
  path: string,
  params?: Record<string, string>,
  options: RadioBrowserJsonOptions = {}
) {
  const url = new URL(path, `https://${host}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  const result = await fetchJsonWithTimeout<T>(url, {
    cache: options.cache,
    signal: options.signal,
    headers: {
      accept: "application/json",
      "user-agent": RADIO_BROWSER_USER_AGENT
    }
  }, options.timeoutMs);

  lastHealthyHost = host;
  return result;
}

export async function getRadioBrowserHosts() {
  const now = Date.now();

  if (serverCache && now < serverCache.refreshAfter) {
    logger.debug("provider.radio.hosts.cache_hit", {
      context: {
        hostCount: serverCache.hosts.length
      },
      message: "Radio Browser host directory cache hit"
    });
    return serverCache.hosts;
  }

  if (serverRefresh) {
    return serverRefresh;
  }

  serverRefresh = refreshRadioBrowserHosts(now)
    .finally(() => {
      serverRefresh = null;
    });

  return serverRefresh;
}

export function getLastHealthyRadioBrowserHost() {
  return lastHealthyHost;
}

export function clearRadioBrowserHostCacheForTest() {
  serverCache = null;
  serverRefresh = null;
  lastHealthyHost = null;
}

async function refreshRadioBrowserHosts(now: number) {
  try {
    const servers = await fetchJsonWithTimeout<RadioBrowserServer[]>(new URL(RADIO_BROWSER_DIRECTORY_URL), {
      headers: {
        accept: "application/json",
        "user-agent": RADIO_BROWSER_USER_AGENT
      }
    });
    const hosts = Array.from(new Set(
      servers
        .map((server) => server.name)
        .filter((host): host is string => Boolean(host))
        .filter((host) => /^[a-z0-9.-]+$/i.test(host))
    ));

    if (hosts.length > 0) {
      serverCache = {
        hosts,
        refreshAfter: now + STATION_CACHE_TTL_MS
      };
      logger.info("provider.radio.hosts.loaded", {
        context: {
          hostCount: hosts.length
        },
        message: "Loaded Radio Browser hosts"
      });
      return hosts;
    }

    throw new Error("Radio Browser host directory returned no usable hosts");
  } catch (error) {
    const usedStaleHosts = Boolean(serverCache);
    const hosts = serverCache?.hosts ?? [...RADIO_BROWSER_FALLBACK_HOSTS];

    serverCache = {
      hosts,
      refreshAfter: now + FALLBACK_CACHE_TTL_MS
    };
    logger.warn("provider.radio.hosts.fallback", {
      context: {
        fallbackHostCount: hosts.length,
        usedStaleHosts
      },
      error,
      message: "Radio Browser host directory failed; using stale or static fallback hosts"
    });
    return hosts;
  }
}

async function fetchJsonWithTimeout<T>(
  input: URL | string,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();
  const url = typeof input === "string" ? new URL(input) : input;

  try {
    const response = await fetch(url, {
      ...init,
      signal: init.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal
    });

    logger.debug("provider.radio.fetch", {
      context: {
        host: url.host,
        path: url.pathname,
        status: response.status
      },
      durationMs: elapsedMs(startedAt),
      message: "Radio Browser fetch completed"
    });

    if (!response.ok) {
      throw new Error(`Radio Browser responded with ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    logger.warn("provider.radio.fetch_failed", {
      context: {
        host: url.host,
        path: url.pathname
      },
      durationMs: elapsedMs(startedAt),
      error,
      message: "Radio Browser fetch failed"
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchWithTimeout(input: URL | string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function elapsedMs(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}
