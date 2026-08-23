import type { TerraMode, TerraPoint } from "./types";

export const terraModes = [
  {
    id: "radio",
    label: "Radio",
    dataEndpoint: "/api/modes/radio/points",
    detailEndpoint: (id: string) => `/api/modes/radio/points/${encodeURIComponent(id)}`,
    playback: {
      label: "Live audio",
      mediaKind: "audio",
      playableEndpoint: (id: string) => `/api/modes/radio/points/${encodeURIComponent(id)}/playable`
    },
    loadingLabel: "Loading radio stations",
    emptyLabel: "No matching radio stations.",
    searchPlaceholder: "Filter by station, country, language, or tag",
    markerMetricLabel: "Listeners",
    markerColorMode: "single",
    markerColorToken: "radio",
    fallbackNotice: "Radio Browser is unavailable.",
    formatPointMetric: formatRadioMetric,
    matchCountry: matchCountryCode,
    matchPoint: matchTextPoint,
    sortPoints: sortRadioStations
  }
] satisfies TerraMode[];

export const defaultMode = terraModes[0];

export function getTerraMode(id: string) {
  return terraModes.find((mode) => mode.id === id) ?? defaultMode;
}

function matchTextPoint(point: TerraPoint, query: string) {
  const value = query.trim().toLowerCase();

  if (!value) {
    return true;
  }

  const metricText = Object.values(point.metrics ?? {}).join(" ");
  const haystack = `${point.name} ${point.summary} ${metricText}`.toLowerCase();
  return haystack.includes(value);
}

function matchCountryCode(point: TerraPoint, countryCode: string) {
  return point.countryCode === countryCode;
}

function formatRadioMetric(point: TerraPoint) {
  const codec = point.metrics?.Codec;
  const bitrate = point.metrics?.Bitrate;

  if (codec && codec !== "Unknown") {
    return String(codec);
  }

  return bitrate === undefined || bitrate === null ? "Live" : String(bitrate);
}

function sortRadioStations(points: TerraPoint[]) {
  return [...points].sort((a, b) => {
    const popularityDiff = getNumericMetric(b, "Clicks") - getNumericMetric(a, "Clicks");

    if (popularityDiff !== 0) {
      return popularityDiff;
    }

    return a.name.localeCompare(b.name);
  });
}

function getNumericMetric(point: TerraPoint, key: string) {
  const value = point.metrics?.[key];
  return typeof value === "number" ? value : 0;
}
