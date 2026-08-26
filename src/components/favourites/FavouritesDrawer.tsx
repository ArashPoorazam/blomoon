"use client";

import { Globe2, Star, Trash2, X } from "lucide-react";
import type { TerraModeId, TerraPoint } from "@/lib/modes/types";
import type { FavouriteGroupDto } from "@/lib/persistence/types";

type FavouritesDrawerProps = {
  groups: FavouriteGroupDto[];
  loading: boolean;
  showOnGlobe: boolean;
  onBackToList: () => void;
  onFavouriteSelect: (modeId: TerraModeId, point: TerraPoint) => void;
  onToggleFavourite: (point: TerraPoint) => void;
  onToggleShowOnGlobe: () => void;
};

export function FavouritesDrawer({
  groups,
  loading,
  onBackToList,
  onFavouriteSelect,
  onToggleFavourite,
  onToggleShowOnGlobe,
  showOnGlobe
}: FavouritesDrawerProps) {
  const favouriteCount = groups.reduce((count, group) => count + group.favourites.length, 0);

  return (
    <div className="favourites-view" aria-label="Favourites">
      <div className="favourites-header">
        <div>
          <div className="drawer-kicker">Saved</div>
          <h2>Favourites</h2>
          <p className="drawer-subtitle">{formatFavouriteCount(favouriteCount, loading)}</p>
        </div>
        <button className="icon-button" type="button" aria-label="Back to list" onClick={onBackToList}>
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      <div className="favourites-actions">
        <button
          aria-pressed={showOnGlobe}
          className={`listed-globe-toggle ${showOnGlobe ? "active" : ""}`}
          type="button"
          onClick={onToggleShowOnGlobe}
        >
          <Globe2 size={15} aria-hidden="true" />
          Display on globe
        </button>
      </div>

      <div className="favourites-body">
        {loading ? <div className="empty-state">Loading favourites</div> : null}
        {!loading && groups.length === 0 ? (
          <div className="favourites-empty">
            <Star size={20} aria-hidden="true" />
            <strong>No favourites saved</strong>
            <span>Use the star beside a station to keep it here and bring it back onto the globe.</span>
          </div>
        ) : null}
        {groups.map((group) => (
          <section className="favourite-group" key={group.modeId}>
            <div className="favourite-group-title">
              <span>{group.label}</span>
              <strong>{group.favourites.length}</strong>
            </div>
            {group.favourites.map((favourite) => (
              <div
                className="favourite-row"
                key={`${favourite.modeId}:${favourite.pointId}`}
              >
                <button
                  className="favourite-row-main"
                  type="button"
                  onClick={() => onFavouriteSelect(favourite.modeId, favourite.point)}
                >
                  <Star size={15} aria-hidden="true" fill="currentColor" />
                  <span>
                    <strong>{favourite.point.name}</strong>
                    <span>{favourite.point.summary}</span>
                  </span>
                </button>
                <button
                  className="favourite-remove"
                  type="button"
                  aria-label={`Remove ${favourite.point.name} from favourites`}
                  onClick={() => onToggleFavourite(favourite.point)}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function formatFavouriteCount(count: number, loading: boolean) {
  if (loading) {
    return "Loading saved stations";
  }

  return count === 1 ? "1 saved station" : `${count} saved stations`;
}
