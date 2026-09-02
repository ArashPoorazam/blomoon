"use client";

import { Star } from "lucide-react";
import type { TerraPoint } from "@/lib/modes/types";

type FavouriteStarButtonProps = {
  favourited: boolean;
  point: TerraPoint;
  onToggle: (point: TerraPoint) => void;
};

export function FavouriteStarButton({ favourited, onToggle, point }: FavouriteStarButtonProps) {
  return (
    <button
      aria-label={favourited ? `Remove ${point.name} from favourites` : `Add ${point.name} to favourites`}
      aria-pressed={favourited}
      className={`favourite-star ${favourited ? "active" : ""}`}
      title={favourited ? "Remove favourite" : "Add favourite"}
      type="button"
      onClick={() => onToggle(point)}
    >
      <Star size={16} aria-hidden="true" />
    </button>
  );
}
