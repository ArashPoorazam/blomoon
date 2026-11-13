import type { TerraPoint } from "./types";
export type LocatedPoint = TerraPoint & { latitude: number; longitude: number };
export function hasPointLocation(point: TerraPoint | null | undefined): point is LocatedPoint {
  return !!point && typeof point.latitude === "number" && Number.isFinite(point.latitude)
    && Math.abs(point.latitude) <= 90 && typeof point.longitude === "number"
    && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180
    && (point.modeId === "radio" || point.locationPrecision === "verified");
}
