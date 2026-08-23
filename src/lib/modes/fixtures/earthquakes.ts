import type { DataSourceInfo, TerraPoint } from "../types";

export const EARTHQUAKE_FIXTURE_SOURCE: DataSourceInfo = {
  name: "USGS Earthquake Hazards Program",
  url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
  attribution: "Fallback fixture data shown because the live USGS feed is unavailable.",
  lastUpdated: "2026-01-01T00:00:00.000Z",
  isFallback: true
};

export const EARTHQUAKE_FIXTURE_POINTS: TerraPoint[] = [
  {
    id: "fixture-california",
    modeId: "earthquakes",
    name: "Central California",
    latitude: 36.7783,
    longitude: -119.4179,
    countryCode: "840",
    severity: 0.46,
    timestamp: "2026-01-01T00:00:00.000Z",
    summary: "Reported region",
    metrics: {
      Magnitude: "3.8",
      Depth: "8.2 km",
      Distance: "Reported region",
      Status: "Fixture",
      Tsunami: "No"
    }
  },
  {
    id: "fixture-japan",
    modeId: "earthquakes",
    name: "Honshu, Japan",
    latitude: 38.2682,
    longitude: 140.8694,
    countryCode: "392",
    severity: 0.54,
    timestamp: "2026-01-01T00:10:00.000Z",
    summary: "Near",
    metrics: {
      Magnitude: "4.6",
      Depth: "42.0 km",
      Distance: "Near",
      Status: "Fixture",
      Tsunami: "No"
    }
  },
  {
    id: "fixture-chile",
    modeId: "earthquakes",
    name: "Chile",
    latitude: -33.4489,
    longitude: -70.6693,
    countryCode: "152",
    severity: 0.59,
    timestamp: "2026-01-01T00:20:00.000Z",
    summary: "Offshore",
    metrics: {
      Magnitude: "5.1",
      Depth: "31.4 km",
      Distance: "Offshore",
      Status: "Fixture",
      Tsunami: "No"
    }
  }
];
