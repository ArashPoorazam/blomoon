"use client";

import { formatDateTime, type CountryInfo } from "@/lib/geo";
import type { TerraMode, TerraModeId, TerraPoint } from "@/lib/modes/types";
import { DrawerListToolbar } from "./drawer/DrawerListToolbar";
import { LoadMoreButton } from "./drawer/LoadMoreButton";
import { FavouriteStarButton } from "./favourites/FavouriteStarButton";

type SideDrawerListProps = {
  activeMode: TerraMode;
  activeModeId: TerraModeId;
  activePlaybackPointKey: string | null;
  hasMoreRemotePoints?: boolean;
  favouritePointIds: Set<string>;
  loading: boolean;
  loadingMoreRemotePoints?: boolean;
  modes: TerraMode[];
  points: TerraPoint[];
  providerError: string | null;
  query: string;
  selectedCountry: CountryInfo | null;
  selectedId: string | null;
  showListedOnGlobe: boolean;
  sortId: string;
  totalPoints: number;
  totalPointsKind: "exact" | "lowerBound";
  onCountryFilterChange: (country: CountryInfo | null) => void;
  onClearCountrySelection: () => void;
  onLoadMoreRemotePoints?: () => void;
  onModeChange: (modeId: TerraModeId) => void;
  onPointSelect: (point: TerraPoint) => void;
  onQueryChange: (value: string) => void;
  onSortChange: (sortId: string) => void;
  onToggleFavourite: (point: TerraPoint) => void;
  onOpenFavourites: () => void;
  onToggleShowListedOnGlobe: () => void;
};

export function SideDrawerList({
  activeMode,
  activeModeId,
  activePlaybackPointKey,
  favouritePointIds,
  hasMoreRemotePoints,
  loading,
  loadingMoreRemotePoints,
  modes,
  points,
  providerError,
  query,
  selectedCountry,
  selectedId,
  showListedOnGlobe,
  sortId,
  totalPoints,
  totalPointsKind,
  onCountryFilterChange,
  onClearCountrySelection,
  onLoadMoreRemotePoints,
  onModeChange,
  onPointSelect,
  onQueryChange,
  onSortChange,
  onToggleFavourite,
  onOpenFavourites,
  onToggleShowListedOnGlobe
}: SideDrawerListProps) {
  const listedPoints = points;
  const hasMorePoints = Boolean(hasMoreRemotePoints);
  const isLoadingMorePoints = Boolean(loadingMoreRemotePoints);

  return (
    <>
      <DrawerListToolbar
        activeMode={activeMode}
        activeModeId={activeModeId}
        favouriteCount={favouritePointIds.size}
        hasMorePoints={hasMorePoints}
        isLoadingMorePoints={isLoadingMorePoints}
        listedCount={listedPoints.length}
        loading={loading}
        modes={modes}
        providerError={providerError}
        query={query}
        selectedCountry={selectedCountry}
        showListedOnGlobe={showListedOnGlobe}
        sortId={sortId}
        totalPoints={totalPoints}
        totalPointsKind={totalPointsKind}
        onCountryFilterChange={onCountryFilterChange}
        onClearCountrySelection={onClearCountrySelection}
        onLoadMorePoints={onLoadMoreRemotePoints}
        onModeChange={onModeChange}
        onOpenFavourites={onOpenFavourites}
        onQueryChange={onQueryChange}
        onSortChange={onSortChange}
        onToggleShowListedOnGlobe={onToggleShowListedOnGlobe}
      />

      <div className="point-list">
        {points.length === 0 ? (
          <div className="empty-state">{loading ? activeMode.loadingLabel : activeMode.emptyLabel}</div>
        ) : (
          listedPoints.map((point) => (
            <div
              className={`point-row ${selectedId === point.id ? "selected" : ""} ${activePlaybackPointKey === getPointKey(point) ? "playback-active" : ""}`}
              key={point.id}
            >
              <button className="point-row-main" type="button" onClick={() => onPointSelect(point)}>
                <span className="point-copy">
                  <span className="point-name">{point.name}</span>
                  <span className="point-meta">
                    {point.summary} · {activeMode.formatPointMetric(point)} · {formatDateTime(point.timestamp)}
                  </span>
                </span>
              </button>
              <FavouriteStarButton
                favourited={favouritePointIds.has(`${point.modeId}:${point.id}`)}
                point={point}
                onToggle={onToggleFavourite}
              />
            </div>
          ))
        )}
        {hasMorePoints ? (
          <LoadMoreButton
            className="point-list-more"
            isLoading={isLoadingMorePoints}
            onLoadMore={onLoadMoreRemotePoints}
          />
        ) : null}
      </div>
    </>
  );
}

function getPointKey(point: TerraPoint) {
  return `${point.modeId}:${point.id}`;
}
