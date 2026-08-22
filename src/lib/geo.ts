import * as THREE from "three";

export const GLOBE_RADIUS = 2;

const DEG_TO_RAD = Math.PI / 180;

export function latLonToVector3(latitude: number, longitude: number, radius = GLOBE_RADIUS) {
  const phi = (90 - latitude) * DEG_TO_RAD;
  const theta = (longitude + 180) * DEG_TO_RAD;

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

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
