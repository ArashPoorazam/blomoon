import type { TerraPoint } from "./types";
import { getPointKey } from "./pointKeys";

export const GLOBE_DISPLAY_BUDGET = 1200;
export const GLOBE_COUNTRY_POINT_GUARANTEE = 4;

export function limitGlobePoints({
  activePlaybackPoint,
  budget,
  countryPointGuarantee = 0,
  points,
  requiredPoints = [],
  selectedPoint
}: {
  activePlaybackPoint: TerraPoint | null;
  budget: number;
  countryPointGuarantee?: number;
  points: TerraPoint[];
  requiredPoints?: TerraPoint[];
  selectedPoint: TerraPoint | null;
}) {
  // Global rank and country rank are independent allowances. Additions must
  // never consume either allowance or displace a higher-ranked source point.
  const limitedPoints = new Map<string, TerraPoint>();
  const seen = new Set<string>();
  const countryCounts = new Map<string, number>();
  let globalCount = 0;

  for (const point of points) {
    const key = getPointKey(point);
    if (seen.has(key)) continue;
    seen.add(key);
    const countryCode = point.countryCode;
    const countryCount = countryCode ? (countryCounts.get(countryCode) ?? 0) : 0;
    if (globalCount < budget || (countryCode && countryCount < countryPointGuarantee)) {
      limitedPoints.set(key, point);
    }
    globalCount += 1;
    if (countryCode) countryCounts.set(countryCode, countryCount + 1);
  }

  for (const point of [...requiredPoints, selectedPoint, activePlaybackPoint]) {
    if (point) limitedPoints.set(getPointKey(point), point);
  }
  return Array.from(limitedPoints.values());
}
