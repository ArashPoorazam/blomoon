"use client";

import { Star, X } from "lucide-react";
import type { TerraModeId, TerraPoint } from "@/lib/modes/types";
import type { FavouriteGroupDto } from "@/lib/persistence/types";

type FavouritesDrawerProps = {
  groups: FavouriteGroupDto[];
  loading: boolean;
  open: boolean;
  onClose: () => void;
  onFavouriteSelect: (modeId: TerraModeId, point: TerraPoint) => void;
};

export function FavouritesDrawer({
  groups,
  loading,
  onClose,
  onFavouriteSelect,
  open
}: FavouritesDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="favourites-drawer" aria-label="Favourites">
      <div className="favourites-header">
        <div>
          <div className="drawer-kicker">Saved</div>
          <h2>Favourites</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Close favourites" onClick={onClose}>
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      <div className="favourites-body">
        {loading ? <div className="empty-state">Loading favourites</div> : null}
        {!loading && groups.length === 0 ? <div className="empty-state">No favourites saved.</div> : null}
        {groups.map((group) => (
          <section className="favourite-group" key={group.modeId}>
            <div className="favourite-group-title">{group.label}</div>
            {group.favourites.map((favourite) => (
              <button
                className="favourite-row"
                key={`${favourite.modeId}:${favourite.pointId}`}
                type="button"
                onClick={() => onFavouriteSelect(favourite.modeId, favourite.point)}
              >
                <Star size={15} aria-hidden="true" fill="currentColor" />
                <span>
                  <strong>{favourite.point.name}</strong>
                  <span>{favourite.point.summary}</span>
                </span>
              </button>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
