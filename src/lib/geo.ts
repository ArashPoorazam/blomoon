import { geoContains } from "d3-geo";
import type * as GeoJSON from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countries from "world-atlas/countries-110m.json";

export const GLOBE_RADIUS = 2;

export type CountryInfo = {
  code: string;
  name: string;
};

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
let cachedCountryByCode: Map<string, CountryInfo> | null = null;
let cachedCountryByName: Map<string, CountryInfo> | null = null;

const countryNameAliases: ReadonlyMap<string, string> = new Map([
  ["bosnia and herzegovina", "bosnia and herz"],
  ["central african republic", "central african rep"],
  ["congo democratic republic of the", "dem rep congo"],
  ["czech republic", "czechia"],
  ["democratic republic of the congo", "dem rep congo"],
  ["dominican republic", "dominican rep"],
  ["equatorial guinea", "eq guinea"],
  ["iran islamic republic of", "iran"],
  ["lao people s democratic republic", "laos"],
  ["moldova republic of", "moldova"],
  ["north macedonia", "macedonia"],
  ["republic of the congo", "congo"],
  ["russian federation", "russia"],
  ["syrian arab republic", "syria"],
  ["tanzania united republic of", "tanzania"],
  ["uk", "united kingdom"],
  ["united states", "united states of america"],
  ["usa", "united states of america"],
  ["venezuela bolivarian republic of", "venezuela"],
  ["viet nam", "vietnam"]
] as const);

const regionDisplayNames = typeof Intl.DisplayNames === "function"
  ? new Intl.DisplayNames(["en"], { type: "region" })
  : null;

export function formatCoordinate(value: number, directionA: string, directionB: string) {
  const direction = value >= 0 ? directionA : directionB;
  return `${Math.abs(value).toFixed(2)} ${direction}`;
}

export function formatDateTime(value?: string) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function isValidLatitude(value: number) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidCoordinatePair(latitude: number, longitude: number) {
  return isValidLatitude(latitude) && isValidLongitude(longitude);
}

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

export function findCountryByCode(code?: string | null): CountryInfo | null {
  const normalizedCode = normalizeIsoNumericCountryCode(code);
  return normalizedCode ? getCountryByCode().get(normalizedCode) ?? null : null;
}

export function normalizeCountryCode(code?: string | null, displayName?: string | null) {
  const numericCode = normalizeIsoNumericCountryCode(code);

  if (numericCode && getCountryByCode().has(numericCode)) {
    return numericCode;
  }

  if (displayName) {
    const country = findCountryByName(displayName);

    if (country) {
      return country.code;
    }
  }

  const alphaCode = normalizeAlphaCountryCode(code);

  if (!alphaCode || !regionDisplayNames) {
    return undefined;
  }

  const country = findCountryByName(regionDisplayNames.of(alphaCode));
  return country?.code;
}

export function getCountryCollection(): GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, { name: string }> {
  return {
    type: "FeatureCollection",
    features: getCountryFeatures()
  };
}

export function getCountryBorderMesh(): GeoJSON.MultiLineString {
  if (!cachedCountryBorderMesh) {
    const topology = getCountriesTopology();
    cachedCountryBorderMesh = mesh(topology, topology.objects.countries);
  }

  return cachedCountryBorderMesh;
}

function getCountryFeatures(): CountryFeature[] {
  if (cachedCountryFeatures) {
    return cachedCountryFeatures;
  }

  const topology = getCountriesTopology();
  const collection = feature<CountryProperties>(topology, topology.objects.countries);
  const features: CountryFeature[] = [];

  collection.features.forEach((country) => {
    const countryId = typeof country.id === "string" ? country.id : String(country.id ?? "");
    const name = country.properties?.name;

    if (!isIsoNumericCountryCode(countryId) || !name || !isCountryGeometry(country.geometry)) {
      return;
    }

    features.push({
      type: "Feature",
      id: countryId.padStart(3, "0"),
      bbox: country.bbox,
      geometry: country.geometry,
      properties: {
        name
      }
    });
  });

  cachedCountryFeatures = features;
  return features;
}

function getCountryByCode() {
  if (cachedCountryByCode) {
    return cachedCountryByCode;
  }

  cachedCountryByCode = new Map(
    getCountryFeatures().map((country) => [
      country.id,
      {
        code: country.id,
        name: country.properties.name
      }
    ])
  );

  return cachedCountryByCode;
}

function findCountryByName(value?: string | null) {
  if (!value) {
    return null;
  }

  return getCountryByName().get(normalizeCountryName(value)) ?? null;
}

function getCountryByName() {
  if (cachedCountryByName) {
    return cachedCountryByName;
  }

  const countryByName = new Map<string, CountryInfo>();

  getCountryFeatures().forEach((country) => {
    const info = {
      code: country.id,
      name: country.properties.name
    };
    const normalizedName = normalizeCountryName(country.properties.name);

    countryByName.set(normalizedName, info);

    countryNameAliases.forEach((canonicalName, alias) => {
      if (canonicalName === normalizedName) {
        countryByName.set(alias, info);
      }
    });
  });

  cachedCountryByName = countryByName;
  return cachedCountryByName;
}

function getCountriesTopology() {
  return countries as CountriesTopology;
}

function isCountryGeometry(
  geometry: GeoJSON.Geometry
): geometry is GeoJSON.Polygon | GeoJSON.MultiPolygon {
  return geometry.type === "Polygon" || geometry.type === "MultiPolygon";
}

function isIsoNumericCountryCode(value: string) {
  return /^\d{3}$/.test(value);
}

function normalizeIsoNumericCountryCode(value?: string | null) {
  const normalized = (value ?? "").trim();
  return /^\d{1,3}$/.test(normalized) ? normalized.padStart(3, "0") : null;
}

function normalizeAlphaCountryCode(value?: string | null) {
  const normalized = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function normalizeCountryName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

  return countryNameAliases.get(normalized) ?? normalized;
}
