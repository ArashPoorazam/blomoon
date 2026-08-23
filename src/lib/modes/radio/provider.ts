import {
  RADIO_BROWSER_DIRECTORY_URL,
  RADIO_BROWSER_FALLBACK_HOSTS,
  RADIO_BROWSER_USER_AGENT,
  REQUEST_TIMEOUT_MS,
  STATION_CACHE_TTL_MS
} from "./config";
import type { RadioBrowserServer } from "./types";

let serverCache: {
  fetchedAt: number;
  hosts: string[];
} | null = null;

export async function fetchRadioBrowserJson<T>(path: string, params?: Record<string, string>): Promise<T> {
  const hosts = await getRadioBrowserHosts();
  let lastError: Error | null = null;

  for (const host of hosts) {
    const url = new URL(path, `https://${host}`);

    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, value);
    }

    try {
      return await fetchJsonWithTimeout<T>(url, {
        headers: {
          accept: "application/json",
          "user-agent": RADIO_BROWSER_USER_AGENT
        }
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Radio Browser request failed");
    }
  }

  throw lastError ?? new Error("Radio Browser request failed");
}

async function getRadioBrowserHosts() {
  const now = Date.now();

  if (serverCache && now - serverCache.fetchedAt < STATION_CACHE_TTL_MS) {
    return serverCache.hosts;
  }

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
        fetchedAt: now,
        hosts
      };
      return hosts;
    }
  } catch {
    // Fall through to stable public mirrors.
  }

  return [...RADIO_BROWSER_FALLBACK_HOSTS];
}

async function fetchJsonWithTimeout<T>(input: URL | string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Radio Browser responded with ${response.status}`);
    }

    return (await response.json()) as T;
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
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}
