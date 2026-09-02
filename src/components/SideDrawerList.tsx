"use client";

import { formatDateTime, type CountryInfo } from "@/lib/geo";
import { getPointKey } from "@/lib/modes/pointKeys";
import type { TerraMode, TerraPoint } from "@/lib/modes/types";
import { DrawerListToolbar } from "./drawer/DrawerListToolbar";
import { LoadMoreButton } from "./drawer/LoadMoreButton";
import { PointActionMenu } from "./drawer/PointActionMenu";
import { FavouriteStarButton } from "./favourites/FavouriteStarButton";

type SideDrawerListProps = {
  activeMode: TerraMode;
  activePlaybackPointKey: string | null;
  hasMoreRemotePoints?: boolean;
  favouritePointIds: Set<string>;
  loading: boolean;
  loadingMoreRemotePoints?: boolean;
  points: TerraPoint[];
  providerError: string | null;
  query: string;
  selectedCountry: CountryInfo | null;
  selectedId: string | null;
  sortId: string;
  totalPoints: number;
  totalPointsKind: "exact" | "lowerBound";
  onCountryFilterChange: (country: CountryInfo | null) => void;
  onClearCountrySelection: () => void;
  onLoadMoreRemotePoints?: () => void;
  onPointInspect: (point: TerraPoint) => void;
  onPointPlay: (point: TerraPoint) => void;
  onQueryChange: (value: string) => void;
  onSortChange: (sortId: string) => void;
  onToggleFavourite: (point: TerraPoint) => void;
};

export function SideDrawerList({
  activeMode,
  activePlaybackPointKey,
  favouritePointIds,
  hasMoreRemotePoints,
  loading,
  loadingMoreRemotePoints,
  points,
  providerError,
  query,
  selectedCountry,
  selectedId,
  sortId,
  totalPoints,
  totalPointsKind,
  onCountryFilterChange,
  onClearCountrySelection,
  onLoadMoreRemotePoints,
  onPointInspect,
  onPointPlay,
  onQueryChange,
  onSortChange,
  onToggleFavourite
}: SideDrawerListProps) {
  const listedPoints = points;
  const hasMorePoints = Boolean(hasMoreRemotePoints);
  const isLoadingMorePoints = Boolean(loadingMoreRemotePoints);

  return (
    <>
      <DrawerListToolbar
        activeMode={activeMode}
        hasMorePoints={hasMorePoints}
        isLoadingMorePoints={isLoadingMorePoints}
        listedCount={listedPoints.length}
        loading={loading}
        providerError={providerError}
        query={query}
        selectedCountry={selectedCountry}
        sortId={sortId}
        totalPoints={totalPoints}
        totalPointsKind={totalPointsKind}
        onCountryFilterChange={onCountryFilterChange}
        onClearCountrySelection={onClearCountrySelection}
        onLoadMorePoints={onLoadMoreRemotePoints}
        onQueryChange={onQueryChange}
        onSortChange={onSortChange}
      />

      <div className="point-list">
        {points.length === 0 ? (
          <div className="empty-state">{loading ? activeMode.copy.loadingLabel : activeMode.copy.emptyLabel}</div>
        ) : (
          listedPoints.map((point) => (
            <div
              className={`point-row ${selectedId === point.id ? "selected" : ""} ${activePlaybackPointKey === getPointKey(point) ? "playback-active" : ""}`}
              key={point.id}
            >
              <button className="point-row-main" type="button" onClick={() => onPointPlay(point)}>
                <span className="point-copy">
                  <span className="point-name">{point.name}</span>
                  <span className="point-meta">
                    {point.summary} · {activeMode.formatPointMetric(point)} · {formatDateTime(point.timestamp)}
                  </span>
                </span>
              </button>
              <FavouriteStarButton
                favourited={favouritePointIds.has(getPointKey(point))}
                point={point}
                onToggle={onToggleFavourite}
              />
              <PointActionMenu point={point} onInfo={onPointInspect} />
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
