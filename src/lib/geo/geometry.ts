import { geoContains } from "d3-geo";
import type * as GeoJSON from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countries from "world-atlas/countries-50m.json";
import { getEstimatedCoordinatesInCountry } from "./countryPlacement";
import { countryInfoFromAtlas, findCountryByCode, type CountryInfo } from "./countries";
import { isValidCoordinatePair } from "./coordinates";

type CountryProperties = {
  name?: string;
};

type CountriesTopology = Topology<{
  countries: GeometryCollection<CountryProperties>;
}>;

export type CountryFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, { name: string }> & {
  id: string;
};

let cachedCountryFeatures: CountryFeature[] | null = null;
let cachedCountryBorderMesh: GeoJSON.MultiLineString | null = null;
let cachedFeatureByCode: Map<string, CountryFeature> | null = null;

export function getCountryAtCoordinates(latitude: number, longitude: number): CountryInfo | null {
  if (!isValidCoordinatePair(latitude, longitude)) {
    return null;
  }

  const point: [number, number] = [longitude, latitude];

  for (const country of getCountryFeatures()) {
    if (geoContains(country, point)) {
      return {
        code: country.id,
        name: country.properties.name
      };
    }
  }

  return null;
}

export function isCoordinateInCountry(latitude: number, longitude: number, code?: string | null) {
  const country = getCountryFeatureByCode(code);

  return Boolean(
    country &&
    isValidCoordinatePair(latitude, longitude) &&
    geoContains(country, [longitude, latitude])
  );
}

export function getCountryCollection(): GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, { name: string }> {
  return {
    type: "FeatureCollection",
    features: getCountryFeatures()
  };
}

export function getCountryFeatureByCode(code?: string | null): CountryFeature | null {
  const country = findCountryByCode(code);

  if (!country) {
    return null;
  }

  if (!cachedFeatureByCode) {
    cachedFeatureByCode = new Map();
    for (const feature of getCountryFeatures()) {
      if (!cachedFeatureByCode.has(feature.id)) cachedFeatureByCode.set(feature.id, feature);
    }
  }
  return cachedFeatureByCode.get(country.code) ?? null;
}

export function getEstimatedCountryCoordinates(code: string, seed: string) {
  const country = getCountryFeatureByCode(code);

  if (!country) {
    return null;
  }

  return getEstimatedCoordinatesInCountry(country, seed, isValidCoordinatePair);
}

export function getCountryBorderMesh(): GeoJSON.MultiLineString {
  if (!cachedCountryBorderMesh) {
    const topology = getCountriesTopology();
    cachedCountryBorderMesh = mesh(topology, topology.objects.countries);
  }

  return cachedCountryBorderMesh;
}

export function getCountryOutlineLines(code?: string | null): GeoJSON.MultiLineString | null {
  const country = getCountryFeatureByCode(code);

  if (!country) {
    return null;
  }

  if (country.geometry.type === "Polygon") {
    return {
      type: "MultiLineString",
      coordinates: country.geometry.coordinates
    };
  }

  return {
    type: "MultiLineString",
    coordinates: country.geometry.coordinates.flat()
  };
}

function getCountryFeatures(): CountryFeature[] {
  if (cachedCountryFeatures) {
    return cachedCountryFeatures;
  }

  const topology = getCountriesTopology();
  const collection = feature<CountryProperties>(topology, topology.objects.countries);
  const features: CountryFeature[] = [];

  collection.features.forEach((country) => {
    const name = country.properties?.name;

    if (!name || !isCountryGeometry(country.geometry)) {
      return;
    }

    const countryInfo = countryInfoFromAtlas(country.id, name);

    if (!countryInfo) {
      return;
    }

    features.push({
      type: "Feature",
      id: countryInfo.code,
      bbox: country.bbox,
      geometry: country.geometry,
      properties: {
        name: countryInfo.name
      }
    });
  });

  cachedCountryFeatures = features;
  return features;
}

function getCountriesTopology() {
  return countries as CountriesTopology;
}

function isCountryGeometry(
  geometry: GeoJSON.Geometry
): geometry is GeoJSON.Polygon | GeoJSON.MultiPolygon {
  return geometry.type === "Polygon" || geometry.type === "MultiPolygon";
}

