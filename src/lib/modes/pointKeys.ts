import type { TerraPoint } from "./types";

export function getPointKey(point: Pick<TerraPoint, "id" | "modeId">) {
  return `${point.modeId}:${point.id}`;
}

export function getPointRefKey(ref: { modeId: TerraPoint["modeId"]; pointId: string }) {
  return `${ref.modeId}:${ref.pointId}`;
}
