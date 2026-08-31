import type { TerraDetailSection, TerraMode, TerraPoint, TerraPointDetail } from "../types";

const radioSortOptions = [
  { id: "votes_desc", label: "Most votes" },
  { id: "votes_asc", label: "Least votes" }
];
const RADIO_MARKER_METRIC_LABEL = "Listeners";

export const radioMode = {
  id: "radio",
  label: "Radio",
  controlIcon: "radio",
  copy: {
    countryLoadingLabel: "Loading country stations",
    emptyLabel: "No matching radio stations.",
    fallbackNotice: "Radio Browser is unavailable.",
    itemPlural: "stations",
    itemSingular: "station",
    listSubtitle: "Radio stations by geography",
    loadingLabel: "Loading radio stations",
    loadingMoreLabel: "Loading more stations",
    randomPlaybackError: "Could not find a random station right now.",
    searchPlaceholder: "Filter by station, country, language, or tag",
    searchingLabel: "Searching stations"
  },
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
  markerMetricLabel: RADIO_MARKER_METRIC_LABEL,
  markerColorMode: "single",
  markerColorToken: "radio",
  formatDetailSections: formatRadioDetailSections,
  formatPointMetric: formatRadioMetric,
  matchCountry: matchCountryCode,
  matchPoint: matchTextPoint,
  sortPoints: sortRadioStations
} satisfies TerraMode;

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

function formatRadioDetailSections(detail: TerraPointDetail | null): TerraDetailSection[] {
  if (!detail) {
    return [
      {
        title: "Station",
        fields: [
          { label: RADIO_MARKER_METRIC_LABEL, value: "Loading" },
          { label: "Time", value: "Loading" }
        ]
      }
    ];
  }

  const fieldValue = getDetailFieldValue(detail);

  return [
    {
      title: "Station",
      fields: [
        { label: "Country", value: fieldValue("Country") },
        { label: "Language", value: fieldValue("Language") },
        { label: "Tags", value: fieldValue("Tags") }
      ]
    },
    {
      title: "Stream",
      fields: [
        { label: "Codec", value: fieldValue("Codec") },
        { label: "Bitrate", value: fieldValue("Bitrate") }
      ]
    },
    {
      title: "Activity",
      fields: [
        { label: RADIO_MARKER_METRIC_LABEL, value: getMetricValue(detail, RADIO_MARKER_METRIC_LABEL, "Unknown") },
        { label: "Votes", value: fieldValue("Votes") },
        { label: "Last checked", value: formatCheckedDateTime(detail.timestamp) }
      ]
    },
    {
      title: "Location",
      fields: [
        { label: "Latitude", value: detail.latitude.toFixed(3) },
        { label: "Longitude", value: detail.longitude.toFixed(3) }
      ]
    }
  ].map((section) => ({
    ...section,
    fields: section.fields.filter((field) => field.value !== "Unknown" && field.value !== "Untagged")
  })).filter((section) => section.fields.length > 0);
}

function getDetailFieldValue(detail: TerraPointDetail) {
  const fields = new Map(detail.fields.map((field) => [field.label, field.value]));

  return (label: string) => fields.get(label) ?? getMetricValue(detail, label, "Unknown");
}

function getMetricValue(point: TerraPoint, label: string, fallback = "?") {
  const value = point.metrics?.[label];
  return value === undefined || value === null ? fallback : String(value);
}

function formatCheckedDateTime(value?: string) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  return [
    new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date),
    new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(date)
  ].join("\n");
}

function getNumericMetric(point: TerraPoint, key: string) {
  const value = point.metrics?.[key];
  return typeof value === "number" ? value : 0;
}
