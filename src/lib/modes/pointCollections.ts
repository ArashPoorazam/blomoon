import { getPointKey } from "./pointKeys";
import type { TerraPoint } from "./types";

export function uniquePoints(points: TerraPoint[]) {
  const seen = new Set<string>();
  const result: TerraPoint[] = [];

  points.forEach((point) => {
    const key = getPointKey(point);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(point);
    }
  });

  return result;
}
