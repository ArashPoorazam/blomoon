import type { TerraPoint } from "./types";
import { getPointKey } from "./pointKeys";

export type GlobeDisplayProfile = "desktop" | "mobile";

export const GLOBE_DISPLAY_BUDGET: Record<GlobeDisplayProfile, number> = {
  desktop: 1200,
  mobile: 450
};

export function limitGlobePoints({
  activePlaybackPoint,
  budget,
  points,
  selectedPoint
}: {
  activePlaybackPoint: TerraPoint | null;
  budget: number;
  points: TerraPoint[];
  selectedPoint: TerraPoint | null;
}) {
  if (points.length <= budget) {
    return points;
  }

  const pinnedPoints = [selectedPoint, activePlaybackPoint].filter((point): point is TerraPoint => Boolean(point));
  const pinnedKeys = new Set(pinnedPoints.map(getPointKey));
  const limitedPoints = new Map<string, TerraPoint>();

  pinnedPoints.forEach((point) => {
    limitedPoints.set(getPointKey(point), point);
  });

  for (const point of points) {
    if (limitedPoints.size >= budget) {
      break;
    }

    const key = getPointKey(point);

    if (!pinnedKeys.has(key)) {
      limitedPoints.set(key, point);
    }
  }

  return Array.from(limitedPoints.values());
}
