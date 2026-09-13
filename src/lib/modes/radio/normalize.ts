import {
  getEstimatedCountryCoordinates,
  isCoordinateInCountry,
  isValidCoordinatePair,
  normalizeCountryCode
} from "@/lib/geo";
import type { RadioBrowserStation, RadioStationRecord } from "./types";

export function normalizeStation(station?: RadioBrowserStation): RadioStationRecord | null {
  if (!station?.stationuuid) {
    return null;
  }

  const country = normalizeText(station.country) || "Unknown country";
  const countryCode = normalizeCountryCode(station.countrycode, country);
  const streamUrl = station.url_resolved || station.url;

  if (!countryCode || !streamUrl || !isSafeStreamUrl(streamUrl) || parseNumber(station.lastcheckok) === 0) {
    return null;
  }

  const exactLatitude = parseNumber(station.geo_lat);
  const exactLongitude = parseNumber(station.geo_long);
  const exactCoordinates = exactLatitude !== null && exactLongitude !== null
    && isCoordinateInCountry(exactLatitude, exactLongitude, countryCode)
    ? {
      latitude: exactLatitude,
      longitude: exactLongitude
    }
    : null;
  const estimatedCoordinates = exactCoordinates ?? getEstimatedCountryCoordinates(countryCode, station.stationuuid);
  const latitude = estimatedCoordinates?.latitude ?? null;
  const longitude = estimatedCoordinates?.longitude ?? null;
  const locationPrecision = exactCoordinates ? "station" : "country";

  if (latitude === null || longitude === null || !isValidCoordinatePair(latitude, longitude)) {
    return null;
  }

  const language = normalizeText(station.language);
  const tags = splitTags(station.tags);
  const codec = normalizeText(station.codec);
  const bitrate = parseNumber(station.bitrate);
  const votes = parseNumber(station.votes) ?? 0;
  const clickCount = parseNumber(station.clickcount) ?? 0;
  const name = normalizeText(station.name) || "Unnamed station";
  const summary = formatStationSummary(country, station.state, language, tags);
  const artworkUrl = normalizeExternalUrl(station.favicon);
  const point = {
    id: station.stationuuid,
    modeId: "radio",
    name,
    latitude,
    longitude,
    locationPrecision,
    countryCode,
    artworkUrl,
    prominence: normalizePopularity(clickCount, votes),
    timestamp: station.lastcheckoktime_iso8601 || station.lastchecktime_iso8601 || undefined,
    summary,
    metrics: {
      Bitrate: bitrate ? `${bitrate} kbps` : "Unknown",
      Clicks: clickCount,
      Codec: codec || "Unknown",
      Country: country,
      Language: language || "Unknown",
      Location: locationPrecision === "station" ? "Station coordinates" : "Estimated in-country placement",
      Tags: tags.join(", ") || "Untagged",
      Votes: votes
    }
  } satisfies RadioStationRecord["point"];

  return {
    clickCount,
    providerStreamUrls: [...new Set([station.url, station.url_resolved].filter((url): url is string => Boolean(url && isSafeStreamUrl(url))))],
    point,
    detail: {
      ...point,
      fields: [
        { label: "Country", value: country },
        { label: "Language", value: language || "Unknown" },
        { label: "Codec", value: codec || "Unknown" },
        { label: "Bitrate", value: bitrate ? `${bitrate} kbps` : "Unknown" },
        { label: "Votes", value: String(votes) },
        { label: "Location", value: point.metrics.Location },
        { label: "Tags", value: tags.join(", ") || "Untagged" }
      ],
      sourceUrl: normalizeExternalUrl(station.homepage)
    },
    searchText: buildSearchText(name, summary, point.metrics),
    streamUrl,
    votes
  };
}

export function isSafeStreamUrl(value?: string | null) {
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

export function normalizeText(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function parseNumber(value: number | string | null | undefined) {
  const number = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
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

function buildSearchText(name: string, summary: string, metrics: NonNullable<RadioStationRecord["point"]["metrics"]>) {
  return `${name} ${summary} ${Object.values(metrics).join(" ")}`.toLowerCase();
}
