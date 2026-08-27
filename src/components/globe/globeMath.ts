import * as THREE from "three";
import { GLOBE_RADIUS } from "@/lib/geo";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export const MIN_CAMERA_DISTANCE = 2.5;
export const DEFAULT_CAMERA_DISTANCE = 5.2;
export const MAX_CAMERA_DISTANCE = 7;
export const MIN_ROTATE_SPEED = 0.18;
export const DEFAULT_ROTATE_SPEED = 0.55;
export const MAX_ROTATE_SPEED = 0.7;
export const KEYBOARD_ORBIT_RADIANS_PER_SECOND = 7.0;
export const GLOBE_AUTO_SPIN_SPEED = 0.4;
export const MARKER_RADIUS = 0.0072;
export const MARKER_ALTITUDE = 1.001;
export const MIN_MARKER_SCALE = 0.4;
export const MAX_MARKER_SCALE = 2.3;

type KeyboardOrbitIntent = {
  azimuth: number;
  polar: number;
};

export function latLonToVector3(latitude: number, longitude: number, radius = GLOBE_RADIUS) {
  const phi = (90 - latitude) * DEG_TO_RAD;
  const theta = (longitude + 180) * DEG_TO_RAD;

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export function vector3ToLatLon(point: THREE.Vector3) {
  const normal = point.clone().normalize();
  const latitude = Math.asin(THREE.MathUtils.clamp(normal.y, -1, 1)) * RAD_TO_DEG;
  const theta = Math.atan2(normal.z, -normal.x) * RAD_TO_DEG;
  const longitude = normalizeLongitude(theta - 180);

  return {
    latitude,
    longitude
  };
}

export function getRotateSpeed(cameraDistance: number) {
  if (cameraDistance <= DEFAULT_CAMERA_DISTANCE) {
    const value = smoothProgress(MIN_CAMERA_DISTANCE, DEFAULT_CAMERA_DISTANCE, cameraDistance);
    return THREE.MathUtils.lerp(MIN_ROTATE_SPEED, DEFAULT_ROTATE_SPEED, value);
  }

  const value = smoothProgress(DEFAULT_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, cameraDistance);
  return THREE.MathUtils.lerp(DEFAULT_ROTATE_SPEED, MAX_ROTATE_SPEED, value);
}

export function getMarkerScale(cameraDistance: number) {
  if (cameraDistance <= DEFAULT_CAMERA_DISTANCE) {
    const value = smoothProgress(MIN_CAMERA_DISTANCE, DEFAULT_CAMERA_DISTANCE, cameraDistance);
    return THREE.MathUtils.lerp(MIN_MARKER_SCALE, 1, value);
  }

  const value = smoothProgress(DEFAULT_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, cameraDistance);
  return THREE.MathUtils.lerp(1, MAX_MARKER_SCALE, value);
}

export function getKeyboardOrbitIntent(code: string): KeyboardOrbitIntent | null {
  switch (code) {
    case "ArrowLeft":
    case "KeyA":
      return { azimuth: -1, polar: 0 };
    case "ArrowRight":
    case "KeyD":
      return { azimuth: 1, polar: 0 };
    case "ArrowUp":
    case "KeyW":
      return { azimuth: 0, polar: -1 };
    case "ArrowDown":
    case "KeyS":
      return { azimuth: 0, polar: 1 };
    default:
      return null;
  }
}

export function getKeyboardOrbitIntentFromKeys(codes: Iterable<string>): KeyboardOrbitIntent {
  let azimuth = 0;
  let polar = 0;

  for (const code of codes) {
    const intent = getKeyboardOrbitIntent(code);

    if (intent) {
      azimuth += intent.azimuth;
      polar += intent.polar;
    }
  }

  return {
    azimuth: THREE.MathUtils.clamp(azimuth, -1, 1),
    polar: THREE.MathUtils.clamp(polar, -1, 1)
  };
}

function normalizeLongitude(longitude: number) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

function smoothProgress(minimum: number, maximum: number, value: number) {
  const progress = THREE.MathUtils.clamp((value - minimum) / (maximum - minimum), 0, 1);
  return progress * progress * (3 - 2 * progress);
}
