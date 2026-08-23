import { geoCentroid, geoContains } from "d3-geo";
import type * as GeoJSON from "geojson";
import type { CountryFeature } from "../geo";

type Coordinates = {
  latitude: number;
  longitude: number;
};

export function getEstimatedCoordinatesInCountry(
  country: CountryFeature,
  seed: string,
  isValidCoordinatePair: (latitude: number, longitude: number) => boolean
): Coordinates | null {
  const bbox = getCountryBoundingBox(country);
  const hash = hashString(seed);

  if (bbox) {
    const [minLongitude, minLatitude, maxLongitude, maxLatitude] = bbox;

    for (let attempt = 0; attempt < 64; attempt += 1) {
      const longitude = interpolate(minLongitude, maxLongitude, seededUnitFloat(hash, attempt * 2));
      const latitude = interpolate(minLatitude, maxLatitude, seededUnitFloat(hash, attempt * 2 + 1));

      if (
        isValidCoordinatePair(latitude, longitude) &&
        geoContains(country, [longitude, latitude])
      ) {
        return {
          latitude,
          longitude
        };
      }
    }
  }

  const [longitude, latitude] = geoCentroid(country);

  if (
    isValidCoordinatePair(latitude, longitude) &&
    geoContains(country, [longitude, latitude])
  ) {
    return {
      latitude,
      longitude
    };
  }

  return null;
}

function getCountryBoundingBox(country: CountryFeature): [number, number, number, number] | null {
  if (country.bbox && country.bbox.length >= 4) {
    return [
      country.bbox[0],
      country.bbox[1],
      country.bbox[2],
      country.bbox[3]
    ];
  }

  const coordinates = getGeometryCoordinates(country.geometry);

  if (coordinates.length === 0) {
    return null;
  }

  let minLongitude = Number.POSITIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;

  coordinates.forEach(([longitude, latitude]) => {
    minLongitude = Math.min(minLongitude, longitude);
    minLatitude = Math.min(minLatitude, latitude);
    maxLongitude = Math.max(maxLongitude, longitude);
    maxLatitude = Math.max(maxLatitude, latitude);
  });

  return [
    minLongitude,
    minLatitude,
    maxLongitude,
    maxLatitude
  ];
}

function getGeometryCoordinates(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): GeoJSON.Position[] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.flat();
  }

  return geometry.coordinates.flat(2);
}

function interpolate(min: number, max: number, ratio: number) {
  return min + (max - min) * ratio;
}

function seededUnitFloat(seed: number, salt: number) {
  let value = seed ^ Math.imul(salt + 1, 0x9e3779b1);
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;

  return (value >>> 0) / 0xffffffff;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
