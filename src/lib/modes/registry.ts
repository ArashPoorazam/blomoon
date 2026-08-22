import type { TerraMode, TerraPoint } from "./types";

export const terraModes = [
  {
    id: "earthquakes",
    label: "Earthquakes",
    dataEndpoint: "/api/modes/earthquakes/points",
    detailEndpoint: (id: string) => `/api/modes/earthquakes/points/${encodeURIComponent(id)}`,
    loadingLabel: "Loading earthquakes",
    emptyLabel: "No matching earthquakes.",
    searchPlaceholder: "Filter by place or magnitude",
    markerMetricLabel: "Magnitude",
    fallbackNotice: "Live earthquake provider unavailable. Showing fixture data.",
    formatPointMetric: formatMagnitudeMetric,
    matchPoint: matchTextPoint,
    sortPoints: sortNewestFirst
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

function sortNewestFirst(points: TerraPoint[]) {
  return [...points].sort((a, b) => getPointTime(b) - getPointTime(a));
}

function formatMagnitudeMetric(point: TerraPoint) {
  const value = point.metrics?.Magnitude;
  return `M ${value === undefined || value === null ? "?" : value}`;
}

function getPointTime(point: TerraPoint) {
  return point.timestamp ? new Date(point.timestamp).getTime() : 0;
}
