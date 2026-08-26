import type { TerraMode, TerraPoint } from "./types";

const radioSortOptions = [
  { id: "votes_desc", label: "Most votes" },
  { id: "votes_asc", label: "Least votes" }
];

export const terraModes = [
  {
    id: "radio",
    label: "Radio",
    dataEndpoint: "/api/modes/radio/points",
    defaultSortId: "votes_desc",
    listEndpoint: (params) => {
      const searchParams = new URLSearchParams({
        limit: String(params.limit),
        offset: String(params.offset),
        sort: params.sortId
      });

      if (params.countryCode) {
        searchParams.set("countryCode", params.countryCode);
      }

      if (params.query.trim()) {
        searchParams.set("q", params.query.trim());
      }

      return `/api/modes/radio/search?${searchParams.toString()}`;
    },
    sortOptions: radioSortOptions,
    countryCatalog: {
      markerEndpoint: (countryCode: string) => (
        `/api/modes/radio/countries/${encodeURIComponent(countryCode)}/points`
      ),
      searchEndpoint: (countryCode: string, params: { limit: number; offset: number; query: string }) => {
        const searchParams = new URLSearchParams({
          limit: String(params.limit),
          offset: String(params.offset)
        });

        if (params.query.trim()) {
          searchParams.set("q", params.query.trim());
        }

        return `/api/modes/radio/countries/${encodeURIComponent(countryCode)}/search?${searchParams.toString()}`;
      }
    },
    detailEndpoint: (id: string) => `/api/modes/radio/points/${encodeURIComponent(id)}`,
    clickEndpoint: (id: string) => `/api/modes/radio/points/${encodeURIComponent(id)}/click`,
    playback: {
      label: "Live audio",
      mediaKind: "audio",
      playableEndpoint: (id: string) => `/api/modes/radio/points/${encodeURIComponent(id)}/playable`,
      randomPointEndpoint: "/api/modes/radio/points/random"
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
    const voteDiff = getNumericMetric(b, "Votes") - getNumericMetric(a, "Votes");

    if (voteDiff !== 0) {
      return voteDiff;
    }

    const clickDiff = getNumericMetric(b, "Clicks") - getNumericMetric(a, "Clicks");

    if (clickDiff !== 0) {
      return clickDiff;
    }

    return a.name.localeCompare(b.name);
  });
}

function getNumericMetric(point: TerraPoint, key: string) {
  const value = point.metrics?.[key];
  return typeof value === "number" ? value : 0;
}
