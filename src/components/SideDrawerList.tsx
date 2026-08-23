"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatDateTime, type CountryInfo } from "@/lib/geo";
import type { TerraMode, TerraModeId, TerraPoint } from "@/lib/modes/types";

const LIST_PAGE_SIZE = 50;

type SideDrawerListProps = {
  activeMode: TerraMode;
  activeModeId: TerraModeId;
  hasMoreRemotePoints?: boolean;
  loading: boolean;
  loadingMoreRemotePoints?: boolean;
  modes: TerraMode[];
  points: TerraPoint[];
  providerError: string | null;
  query: string;
  selectedCountry: CountryInfo | null;
  selectedId: string | null;
  totalPoints: number;
  onClearCountrySelection: () => void;
  onLoadMoreRemotePoints?: () => void;
  onModeChange: (modeId: TerraModeId) => void;
  onPointSelect: (point: TerraPoint) => void;
  onQueryChange: (value: string) => void;
};

export function SideDrawerList({
  activeMode,
  activeModeId,
  hasMoreRemotePoints,
  loading,
  loadingMoreRemotePoints,
  modes,
  points,
  providerError,
  query,
  selectedCountry,
  selectedId,
  totalPoints,
  onClearCountrySelection,
  onLoadMoreRemotePoints,
  onModeChange,
  onPointSelect,
  onQueryChange
}: SideDrawerListProps) {
  const [visibleLimit, setVisibleLimit] = useState(LIST_PAGE_SIZE);
  const usesRemotePaging = Boolean(onLoadMoreRemotePoints);
  const listedPoints = useMemo(
    () => usesRemotePaging ? points : points.slice(0, visibleLimit),
    [points, usesRemotePaging, visibleLimit]
  );
  const matchingPointCount = usesRemotePaging ? totalPoints : points.length;
  const hasMorePoints = usesRemotePaging ? Boolean(hasMoreRemotePoints) : listedPoints.length < points.length;

  useEffect(() => {
    setVisibleLimit(LIST_PAGE_SIZE);
  }, [activeModeId, query, selectedCountry?.code, usesRemotePaging]);

  return (
    <>
      <div className="drawer-header">
        <div>
          <div className="drawer-kicker">Terravue</div>
          <h1 className="drawer-title">{activeMode.label}</h1>
          <ModeSwitcher
            activeModeId={activeModeId}
            modes={modes}
            onModeChange={onModeChange}
          />
          <p className="drawer-subtitle">
            {loading ? activeMode.loadingLabel : formatVisibleCount(listedPoints.length, matchingPointCount, totalPoints)}
          </p>
        </div>
      </div>

      <div className="search-row">
        <Search size={16} aria-hidden="true" />
        <input
          className="search-input"
          placeholder={activeMode.searchPlaceholder}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      <ProviderNotice message={providerError} />
      <CountryFilter country={selectedCountry} onClear={onClearCountrySelection} />

      <div className="point-list">
        {points.length === 0 ? (
          <div className="empty-state">{loading ? activeMode.loadingLabel : activeMode.emptyLabel}</div>
        ) : (
          listedPoints.map((point) => (
            <button
              className={`point-row ${selectedId === point.id ? "selected" : ""}`}
              key={point.id}
              type="button"
              onClick={() => onPointSelect(point)}
            >
              <span className="point-copy">
                <span className="point-name">{point.name}</span>
                <span className="point-meta">
                  {point.summary} · {formatDateTime(point.timestamp)}
                </span>
              </span>
              <span className="point-metric">
                {activeMode.formatPointMetric(point)}
              </span>
            </button>
          ))
        )}
        {hasMorePoints ? (
          <button
            className="point-list-more"
            disabled={loadingMoreRemotePoints}
            type="button"
            onClick={() => {
              if (onLoadMoreRemotePoints) {
                onLoadMoreRemotePoints();
                return;
              }

              setVisibleLimit((value) => value + LIST_PAGE_SIZE);
            }}
          >
            {loadingMoreRemotePoints ? "Loading" : "Show 50 more"}
          </button>
        ) : null}
      </div>
    </>
  );
}

function CountryFilter({
  country,
  onClear
}: {
  country: CountryInfo | null;
  onClear: () => void;
}) {
  if (!country) {
    return null;
  }

  return (
    <div className="country-filter">
      <span>
        Country filter
        <strong>{country.name}</strong>
      </span>
      <button type="button" aria-label="Clear country filter" onClick={onClear}>
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

function ModeSwitcher({
  activeModeId,
  modes,
  onModeChange
}: {
  activeModeId: TerraModeId;
  modes: TerraMode[];
  onModeChange: (modeId: TerraModeId) => void;
}) {
  return (
    <div className="mode-switcher" aria-label="Data mode">
      {modes.map((mode) => (
        <button
          aria-pressed={activeModeId === mode.id}
          className={activeModeId === mode.id ? "active" : ""}
          key={mode.id}
          type="button"
          onClick={() => onModeChange(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

function ProviderNotice({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return <div className="provider-notice">{message}</div>;
}

function formatVisibleCount(listedCount: number, matchingCount: number, totalCount: number) {
  if (matchingCount === 0) {
    return "0 visible points";
  }

  if (matchingCount === totalCount) {
    return `${listedCount} listed of ${totalCount} points`;
  }

  return `${listedCount} listed of ${matchingCount} matching points`;
}
