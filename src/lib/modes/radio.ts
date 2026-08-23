import type { TerraDataset, TerraPlayableAudio, TerraPoint, TerraPointDetail } from "./types";
import { RADIO_FIXTURE_RECORDS, RADIO_FIXTURE_SOURCE } from "./fixtures/radio";
import { isValidCoordinatePair, normalizeCountryCode } from "@/lib/geo";

const RADIO_BROWSER_DIRECTORY_URL = "https://all.api.radio-browser.info/json/servers";
const RADIO_BROWSER_FALLBACK_HOSTS = [
  "de1.api.radio-browser.info",
  "nl1.api.radio-browser.info",
  "at1.api.radio-browser.info"
] as const;
const RADIO_BROWSER_USER_AGENT = "Terravue/0.1 (+https://github.com/daedalus/terravue)";
const STATION_CACHE_TTL_MS = 30 * 60 * 1000;
const FALLBACK_CACHE_TTL_MS = 2 * 60 * 1000;
const STREAM_CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 7_000;
const STREAM_VALIDATION_TIMEOUT_MS = 5_000;
const CATALOG_LIMIT = 420;

type RadioBrowserServer = {
  name?: string;
};

type RadioBrowserStation = {
  stationuuid?: string;
  name?: string;
  url?: string;
  url_resolved?: string;
  homepage?: string;
  favicon?: string;
  tags?: string;
  country?: string;
  countrycode?: string;
  state?: string;
  language?: string;
  languagecodes?: string;
  votes?: number;
  clickcount?: number;
  codec?: string;
  bitrate?: number;
  lastcheckok?: number;
  lastchecktime_iso8601?: string;
  geo_lat?: number | string | null;
  geo_long?: number | string | null;
};

type RadioClickResponse = {
  ok?: boolean;
  url?: string;
};

type RadioStationRecord = {
  point: TerraPoint;
  detail: TerraPointDetail;
  streamUrl: string;
};

let stationCache: {
  fetchedAt: number;
  dataset: TerraDataset;
  isFallback: boolean;
  records: Map<string, RadioStationRecord>;
} | null = null;

let serverCache: {
  fetchedAt: number;
  hosts: string[];
} | null = null;

const playableCache = new Map<string, {
  fetchedAt: number;
  stream: TerraPlayableAudio;
}>();

export async function getRadioDataset(force = false): Promise<TerraDataset> {
  const now = Date.now();
  const stationCacheTtl = stationCache?.isFallback ? FALLBACK_CACHE_TTL_MS : STATION_CACHE_TTL_MS;

  if (!force && stationCache && now - stationCache.fetchedAt < stationCacheTtl) {
    return stationCache.dataset;
  }

  try {
    const stations = await fetchRadioBrowserJson<RadioBrowserStation[]>("/json/stations/search", {
      has_geo_info: "true",
      hidebroken: "true",
      limit: String(CATALOG_LIMIT),
      order: "clickcount",
      reverse: "true"
    });
    const records = stations
      .map(normalizeStation)
      .filter((record): record is RadioStationRecord => Boolean(record));

    if (records.length === 0) {
      throw new Error("Radio Browser returned no usable stations");
    }

    const dataset: TerraDataset = {
      modeId: "radio",
      source: {
        name: "Radio Browser",
        url: "https://www.radio-browser.info/",
        attribution: "Community radio station data provided by Radio Browser.",
        lastUpdated: new Date().toISOString()
      },
      points: records.map((record) => record.point)
    };

    stationCache = {
      fetchedAt: now,
      dataset,
      isFallback: false,
      records: new Map(records.map((record) => [record.point.id, record]))
    };

    return dataset;
  } catch {
    return getFallbackDataset(now);
  }
}

export async function getRadioDetail(id: string): Promise<TerraPointDetail | null> {
  const record = await getRadioStationRecord(id);
  return record?.detail ?? null;
}

export async function getRadioPlayableStream(id: string): Promise<TerraPlayableAudio | null> {
  const now = Date.now();
  const cached = playableCache.get(id);

  if (cached && now - cached.fetchedAt < STREAM_CACHE_TTL_MS) {
    return cached.stream;
  }

  const record = await getRadioStationRecord(id);

  if (!record) {
    return null;
  }

  const clickedUrl = await resolveClickedStationUrl(id);
  const streamUrl = clickedUrl ?? record.streamUrl;
  const validation = await validateStreamUrl(streamUrl);
  const stream: TerraPlayableAudio = {
    checkedAt: new Date().toISOString(),
    contentType: validation.contentType,
    mediaKind: "audio",
    pointId: id,
    streamUrl
  };

  playableCache.set(id, {
    fetchedAt: now,
    stream
  });

  return stream;
}

async function getRadioStationRecord(id: string) {
  await getRadioDataset();

  const cachedRecord = stationCache?.records.get(id);

  if (cachedRecord) {
    return cachedRecord;
  }

  const stations = await fetchRadioBrowserJson<RadioBrowserStation[]>(`/json/stations/byuuid/${encodeURIComponent(id)}`);
  const record = normalizeStation(stations[0]);

  if (record && stationCache) {
    stationCache.records.set(id, record);
  }

  return record;
}

async function resolveClickedStationUrl(id: string) {
  try {
    const response = await fetchRadioBrowserJson<RadioClickResponse>(`/json/url/${encodeURIComponent(id)}`);
    return response.ok && isSafeStreamUrl(response.url) ? response.url : null;
  } catch {
    return null;
  }
}

async function validateStreamUrl(streamUrl: string) {
  if (!isSafeStreamUrl(streamUrl)) {
    throw new Error("Station stream URL is not playable.");
  }

  const headResult = await probeStream(streamUrl, "HEAD");

  if (headResult.ok) {
    return headResult;
  }

  const getResult = await probeStream(streamUrl, "GET");

  if (getResult.ok) {
    return getResult;
  }

  throw new Error("Station stream did not respond with a playable status.");
}

async function probeStream(streamUrl: string, method: "GET" | "HEAD") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STREAM_VALIDATION_TIMEOUT_MS);

  try {
    const response = await fetch(streamUrl, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "audio/*,*/*;q=0.8",
        ...(method === "GET" ? { range: "bytes=0-0" } : {})
      }
    });

    if (method === "GET") {
      await response.body?.cancel();
    }

    return {
      ok: response.ok || response.status === 206,
      contentType: response.headers.get("content-type") ?? undefined
    };
  } catch {
    return {
      ok: false,
      contentType: undefined
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRadioBrowserJson<T>(path: string, params?: Record<string, string>): Promise<T> {
  const hosts = await getRadioBrowserHosts();
  let lastError: Error | null = null;

  for (const host of hosts) {
    const url = new URL(path, `https://${host}`);

    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, value);
    }

    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          accept: "application/json",
          "user-agent": RADIO_BROWSER_USER_AGENT
        }
      });

      if (!response.ok) {
        throw new Error(`Radio Browser responded with ${response.status}`);
      }

      return (await response.json()) as T;
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
    const response = await fetchWithTimeout(new URL(RADIO_BROWSER_DIRECTORY_URL), {
      headers: {
        accept: "application/json",
        "user-agent": RADIO_BROWSER_USER_AGENT
      }
    });

    if (!response.ok) {
      throw new Error(`Radio Browser directory responded with ${response.status}`);
    }

    const servers = (await response.json()) as RadioBrowserServer[];
    const hosts = servers
      .map((server) => server.name)
      .filter((host): host is string => Boolean(host))
      .filter((host) => /^[a-z0-9.-]+$/i.test(host));

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

async function fetchWithTimeout(input: URL, init: RequestInit = {}) {
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

function normalizeStation(station?: RadioBrowserStation): RadioStationRecord | null {
  if (!station?.stationuuid) {
    return null;
  }

  const latitude = parseCoordinate(station.geo_lat);
  const longitude = parseCoordinate(station.geo_long);
  const streamUrl = station.url_resolved || station.url;

  if (
    latitude === null ||
    longitude === null ||
    !isValidCoordinatePair(latitude, longitude) ||
    !streamUrl ||
    !isSafeStreamUrl(streamUrl) ||
    station.lastcheckok === 0
  ) {
    return null;
  }

  const country = normalizeText(station.country) || "Unknown country";
  const countryCode = normalizeCountryCode(station.countrycode, country);
  const language = normalizeText(station.language);
  const tags = splitTags(station.tags);
  const codec = normalizeText(station.codec);
  const bitrate = typeof station.bitrate === "number" && station.bitrate > 0 ? station.bitrate : null;
  const votes = typeof station.votes === "number" ? station.votes : 0;
  const clickCount = typeof station.clickcount === "number" ? station.clickcount : 0;
  const name = normalizeText(station.name) || "Unnamed station";
  const summary = formatStationSummary(country, station.state, language, tags);
  const point: TerraPoint = {
    id: station.stationuuid,
    modeId: "radio",
    name,
    latitude,
    longitude,
    countryCode,
    prominence: normalizePopularity(clickCount, votes),
    timestamp: station.lastchecktime_iso8601 || undefined,
    summary,
    metrics: {
      Bitrate: bitrate ? `${bitrate} kbps` : "Unknown",
      Clicks: clickCount,
      Codec: codec || "Unknown",
      Country: country,
      Language: language || "Unknown",
      Tags: tags.join(", ") || "Untagged",
      Votes: votes
    }
  };

  return {
    point,
    detail: {
      ...point,
      fields: [
        { label: "Country", value: country },
        { label: "Language", value: language || "Unknown" },
        { label: "Codec", value: codec || "Unknown" },
        { label: "Bitrate", value: bitrate ? `${bitrate} kbps` : "Unknown" },
        { label: "Votes", value: String(votes) },
        { label: "Tags", value: tags.join(", ") || "Untagged" }
      ],
      sourceUrl: normalizeExternalUrl(station.homepage)
    },
    streamUrl
  };
}

function parseCoordinate(value: RadioBrowserStation["geo_lat"]) {
  const coordinate = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof coordinate === "number" && Number.isFinite(coordinate) ? coordinate : null;
}

function normalizeText(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function splitTags(value?: string | null) {
  return normalizeText(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function formatStationSummary(country: string, state?: string, language?: string, tags: string[] = []) {
  const parts = [
    normalizeText(state),
    country,
    normalizeText(language),
    tags.slice(0, 2).join(", ")
  ].filter(Boolean);

  return parts.join(" · ");
}

function normalizePopularity(clickCount: number, votes: number) {
  const score = Math.log10(Math.max(0, clickCount) + Math.max(0, votes) * 5 + 1) / 5;
  return Math.min(1, Math.max(0.12, score));
}

function normalizeExternalUrl(value?: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function isSafeStreamUrl(value?: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getFallbackDataset(fetchedAt = Date.now()): TerraDataset {
  const records = RADIO_FIXTURE_RECORDS;
  const dataset: TerraDataset = {
    modeId: "radio",
    source: RADIO_FIXTURE_SOURCE,
    points: records.map((record) => record.point)
  };

  stationCache = {
    fetchedAt,
    dataset,
    isFallback: true,
    records: new Map(records.map((record) => [record.point.id, record]))
  };

  return dataset;
}
