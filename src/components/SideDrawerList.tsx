"use client";

import type { CountryInfo } from "@/lib/geo";
import type { TerraMode, TerraPoint } from "@/lib/modes/types";
import { DrawerListToolbar } from "./drawer/DrawerListToolbar";
import { LoadMoreButton } from "./drawer/LoadMoreButton";
import { PointListRow } from "./drawer/PointListRow";

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
  suggestionTitle?: string;
  catalogTotal?: number;
  totalPoints: number;
  totalPointsKind: "exact" | "lowerBound";
  onCountryFilterChange: (country: CountryInfo | null) => void;
  onClearCountrySelection: () => void;
  onLoadMoreRemotePoints?: () => void;
  onPointInspect: (point: TerraPoint) => void;
  onPointPlay: (point: TerraPoint) => void;
  onPointShare: (point: TerraPoint) => void;
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
  suggestionTitle,
  catalogTotal,
  totalPoints,
  totalPointsKind,
  onCountryFilterChange,
  onClearCountrySelection,
  onLoadMoreRemotePoints,
  onPointInspect,
  onPointPlay,
  onPointShare,
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
        suggestionTitle={suggestionTitle}
        catalogTotal={catalogTotal}
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
          listedPoints.map((point) => <PointListRow
            activeMode={activeMode}
            activePlaybackPointKey={activePlaybackPointKey}
            favouritePointIds={favouritePointIds}
            key={point.id}
            point={point}
            selected={selectedId === point.id}
            onInspect={onPointInspect}
            onPlay={onPointPlay}
            onShare={onPointShare}
            onToggleFavourite={onToggleFavourite}
          />)
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
