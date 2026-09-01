import type { FavouriteRef } from "./types";

export function toFavouriteKey(ref: FavouriteRef) {
  return `${ref.modeId}:${ref.pointId}`;
}
