import type { TerraPoint } from "./types";

export function getPointKey(point: Pick<TerraPoint, "id" | "modeId">) {
  return `${point.modeId}:${point.id}`;
}
