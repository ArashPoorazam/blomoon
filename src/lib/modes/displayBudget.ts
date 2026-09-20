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
  if (points.length <= budget && requiredPoints.length === 0 && !selectedPoint && !activePlaybackPoint) {
    return points;
  }

  const pinnedPoints = [...requiredPoints, selectedPoint, activePlaybackPoint]
    .filter((point): point is TerraPoint => Boolean(point));
  const limitedPoints = new Map<string, TerraPoint>();
  const countryCounts = new Map<string, number>();

  pinnedPoints.forEach((point) => {
    limitedPoints.set(getPointKey(point), point);
  });

  // Count the ranked source independently: lower-ranked pinned points must not
  // replace a country's top points. Mandatory coverage may exceed the budget.
  if (countryPointGuarantee > 0) {
    const seen = new Set<string>();
    for (const point of points) {
      const key = getPointKey(point);
      if (seen.has(key)) continue;
      seen.add(key);
      const countryCode = point.countryCode;

      if (!countryCode || (countryCounts.get(countryCode) ?? 0) >= countryPointGuarantee) {
        continue;
      }

      limitedPoints.set(key, point);
      countryCounts.set(countryCode, (countryCounts.get(countryCode) ?? 0) + 1);
    }
  }

  for (const point of points) {
    if (limitedPoints.size >= budget) {
      break;
    }

    limitedPoints.set(getPointKey(point), point);
  }

  return Array.from(limitedPoints.values());
}
