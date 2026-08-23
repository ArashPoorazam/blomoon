import type { TerraDataset, TerraPoint, TerraPointDetail } from "./types";
import { EARTHQUAKE_FIXTURE_POINTS, EARTHQUAKE_FIXTURE_SOURCE } from "./fixtures/earthquakes";
import { getCountryAtCoordinates, isValidCoordinatePair } from "@/lib/geo";

const USGS_ALL_DAY_FEED =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

const CACHE_TTL_MS = 10 * 60 * 1000;
const EARTHQUAKE_MAGNITUDE_MIN = -1;
const EARTHQUAKE_MAGNITUDE_MAX = 9.5;

type UsgsFeature = {
  id: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number | null;
    updated: number | null;
    url: string | null;
    status: string | null;
    tsunami: number | null;
    type: string | null;
    title: string | null;
  };
  geometry: {
    coordinates: [number, number, number?];
  } | null;
};

type UsgsResponse = {
  metadata?: {
    generated?: number;
    url?: string;
  };
  features?: UsgsFeature[];
};

let cache: {
  fetchedAt: number;
  dataset: TerraDataset;
} | null = null;

export async function getEarthquakeDataset(force = false): Promise<TerraDataset> {
  const now = Date.now();

  if (!force && cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.dataset;
  }

  try {
    const response = await fetch(USGS_ALL_DAY_FEED, {
      next: { revalidate: 600 },
      headers: {
        accept: "application/geo+json, application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`USGS responded with ${response.status}`);
    }

    const payload = (await response.json()) as UsgsResponse;
    const generatedAt = payload.metadata?.generated
      ? new Date(payload.metadata.generated).toISOString()
      : new Date().toISOString();

    const points = (payload.features ?? [])
      .map(normalizeFeature)
      .filter((point): point is TerraPoint => Boolean(point))
      .sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTime - aTime;
      });

    if (points.length === 0) {
      throw new Error("USGS returned no usable earthquake features");
    }

    const dataset: TerraDataset = {
      modeId: "earthquakes",
      source: {
        name: "USGS Earthquake Hazards Program",
        url: USGS_ALL_DAY_FEED,
        attribution: "Earthquake data provided by USGS.",
        lastUpdated: generatedAt
      },
      points
    };

    cache = { fetchedAt: now, dataset };
    return dataset;
  } catch {
    const dataset = getFallbackDataset();
    cache = { fetchedAt: now, dataset };
    return dataset;
  }
}

export async function getEarthquakeDetail(id: string): Promise<TerraPointDetail | null> {
  const dataset = await getEarthquakeDataset();
  const point = dataset.points.find((item) => item.id === id);

  if (!point) {
    return null;
  }

  const magnitude = getMetric(point, "Magnitude");
  const depth = getMetric(point, "Depth");

  return {
    ...point,
    fields: [
      { label: "Magnitude", value: magnitude },
      { label: "Depth", value: depth },
      { label: "Latitude", value: `${point.latitude.toFixed(3)}` },
      { label: "Longitude", value: `${point.longitude.toFixed(3)}` },
      { label: "Time", value: point.timestamp ? new Date(point.timestamp).toLocaleString() : "Unknown" },
      { label: "Status", value: String(point.metrics?.Status ?? "Unknown") }
    ],
    sourceUrl: typeof point.metrics?.SourceUrl === "string" ? point.metrics.SourceUrl : undefined
  };
}

function normalizeFeature(feature: UsgsFeature): TerraPoint | null {
  const coordinates = feature.geometry?.coordinates;

  if (!coordinates) {
    return null;
  }

  const [longitude, latitude, depthKm = 0] = coordinates;

  if (!isValidCoordinatePair(latitude, longitude)) {
    return null;
  }

  const magnitude = feature.properties.mag;
  const title = feature.properties.title ?? feature.properties.place ?? "Earthquake";
  const place = normalizePlace(feature.properties.place ?? title);
  const timestamp = feature.properties.time ? new Date(feature.properties.time).toISOString() : undefined;
  const country = getCountryAtCoordinates(latitude, longitude);

  return {
    id: feature.id,
    modeId: "earthquakes",
    name: place.name,
    latitude,
    longitude,
    countryCode: country?.code,
    severity: normalizeMagnitude(magnitude),
    timestamp,
    summary: place.context,
    metrics: {
      Magnitude: magnitude === null ? "Unknown" : magnitude.toFixed(1),
      Depth: `${depthKm.toFixed(1)} km`,
      Distance: place.context,
      Status: feature.properties.status ?? "Unknown",
      Tsunami: feature.properties.tsunami ? "Yes" : "No",
      SourceUrl: feature.properties.url
    }
  };
}

function normalizePlace(value: string) {
  const withoutMagnitude = value.replace(/^M\s*-?\d+(?:\.\d+)?\s*-\s*/i, "").trim();
  const distanceMatch = withoutMagnitude.match(/^(.+?\bkm\s+[NSEW]{1,3})\s+of\s+(.+)$/i);

  if (distanceMatch) {
    return {
      name: distanceMatch[2].trim(),
      context: distanceMatch[1].trim()
    };
  }

  return {
    name: withoutMagnitude || "Unknown location",
    context: "Reported region"
  };
}

function normalizeMagnitude(magnitude: number | null) {
  if (magnitude === null || !Number.isFinite(magnitude)) {
    return 0.25;
  }

  const range = EARTHQUAKE_MAGNITUDE_MAX - EARTHQUAKE_MAGNITUDE_MIN;
  const normalized = (magnitude - EARTHQUAKE_MAGNITUDE_MIN) / range;

  return Math.min(1, Math.max(0.05, normalized));
}

function getMetric(point: TerraPoint, key: string) {
  const value = point.metrics?.[key];
  return value === undefined || value === null ? "Unknown" : String(value);
}

function getFallbackDataset(): TerraDataset {
  return {
    modeId: "earthquakes",
    source: EARTHQUAKE_FIXTURE_SOURCE,
    points: EARTHQUAKE_FIXTURE_POINTS
  };
}
