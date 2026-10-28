export const GLOBE_RADIUS = 2;

export function isValidLatitude(value: number) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidCoordinatePair(latitude: number, longitude: number) {
  return isValidLatitude(latitude) && isValidLongitude(longitude);
}

