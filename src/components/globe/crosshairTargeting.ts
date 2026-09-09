import * as THREE from "three";
import { GLOBE_RADIUS } from "@/lib/geo";
import type { TerraPoint } from "@/lib/modes/types";
import { MARKER_ALTITUDE, latLonToVector3 } from "./globeMath";

export const CROSSHAIR_CAPTURE_RADIUS_PX = 36;
export const CROSSHAIR_CENTER_TOLERANCE_PX = 4;
export const CROSSHAIR_IDLE_DELAY_MS = 180;

const MIN_CAMERA_FACING_DOT = 0.01;

export type CrosshairCandidate = {
  distancePx: number;
  point: TerraPoint;
};

export function findNearestCrosshairPoint({
  camera,
  height,
  points,
  radiusPx = CROSSHAIR_CAPTURE_RADIUS_PX,
  width
}: {
  camera: THREE.Camera;
  height: number;
  points: TerraPoint[];
  radiusPx?: number;
  width: number;
}): CrosshairCandidate | null {
  const cameraNormal = camera.position.clone().normalize();
  const projected = new THREE.Vector3();
  let nearest: CrosshairCandidate | null = null;

  for (const point of points) {
    const normal = latLonToVector3(point.latitude, point.longitude, 1).normalize();

    if (!isSurfaceFacingCamera(normal, cameraNormal)) {
      continue;
    }

    projected.copy(normal).multiplyScalar(GLOBE_RADIUS * MARKER_ALTITUDE).project(camera);

    if (projected.z < -1 || projected.z > 1) {
      continue;
    }

    const distancePx = Math.hypot(projected.x * width * 0.5, projected.y * height * 0.5);

    if (distancePx <= radiusPx && (!nearest || distancePx < nearest.distancePx)) {
      nearest = { distancePx, point };
    }
  }

  return nearest;
}

export function isSurfaceFacingCamera(surfaceNormal: THREE.Vector3, cameraNormal: THREE.Vector3) {
  return surfaceNormal.dot(cameraNormal) > MIN_CAMERA_FACING_DOT;
}
