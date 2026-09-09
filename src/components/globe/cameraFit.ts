import { GLOBE_RADIUS } from "@/lib/geo";

export const GLOBE_CAMERA_FOV = 42;
const FIT_RADIUS = GLOBE_RADIUS * 1.08;

/** Fit the sphere's silhouette along the narrower field of view, including its effects. */
export function getViewportFitDistance(width: number, height: number, fov = GLOBE_CAMERA_FOV) {
  const verticalHalfAngle = fov * Math.PI / 360;
  const horizontalHalfAngle = Math.atan(Math.tan(verticalHalfAngle) * Math.max(1, width) / Math.max(1, height));
  return FIT_RADIUS / Math.sin(Math.min(verticalHalfAngle, horizontalHalfAngle));
}
