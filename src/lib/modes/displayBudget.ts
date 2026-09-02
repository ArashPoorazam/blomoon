import type { TerraPoint } from "./types";
import { getPointKey } from "./pointKeys";

export type GlobeDisplayProfile = "desktop" | "mobile";

export const GLOBE_DISPLAY_BUDGET: Record<GlobeDisplayProfile, number> = {
  desktop: 1200,
  mobile: 400
};

export const GLOBE_COUNTRY_POINT_GUARANTEE: Record<GlobeDisplayProfile, number> = {
  desktop: 4,
  mobile: 2
};

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
  if (points.length <= budget && requiredPoints.length === 0) {
    return points;
  }

  const pinnedPoints = [...requiredPoints, selectedPoint, activePlaybackPoint]
    .filter((point): point is TerraPoint => Boolean(point));
  const limitedPoints = new Map<string, TerraPoint>();
  const countryCounts = new Map<string, number>();

  pinnedPoints.forEach((point) => {
    addLimitedPoint(limitedPoints, countryCounts, point);
  });

  if (countryPointGuarantee > 0) {
    for (const point of points) {
      const countryCode = point.countryCode;

      if (!countryCode || (countryCounts.get(countryCode) ?? 0) >= countryPointGuarantee) {
        continue;
      }

      addLimitedPoint(limitedPoints, countryCounts, point);

      if (limitedPoints.size >= budget && requiredPoints.length === 0) {
        break;
      }
    }
  }

  for (const point of points) {
    if (limitedPoints.size >= budget) {
      break;
    }

    addLimitedPoint(limitedPoints, countryCounts, point);
  }

  return Array.from(limitedPoints.values());
}

function addLimitedPoint(
  limitedPoints: Map<string, TerraPoint>,
  countryCounts: Map<string, number>,
  point: TerraPoint
) {
  const key = getPointKey(point);

  if (limitedPoints.has(key)) {
    return;
  }

  limitedPoints.set(key, point);

  if (point.countryCode) {
    countryCounts.set(point.countryCode, (countryCounts.get(point.countryCode) ?? 0) + 1);
  }
}
