"use client";

import { Globe2, Search, X } from "lucide-react";
import { useMemo } from "react";
import { findCountryByCode, formatDateTime, getKnownCountries, type CountryInfo } from "@/lib/geo";
import type { TerraMode, TerraModeId, TerraPoint } from "@/lib/modes/types";

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
  onToggleShowListedOnGlobe: () => void;
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
  onToggleShowListedOnGlobe
}: SideDrawerListProps) {
  const listedPoints = points;
  const countries = useMemo(getKnownCountries, []);
  const hasMorePoints = Boolean(hasMoreRemotePoints);
  const isLoadingMorePoints = Boolean(loadingMoreRemotePoints);

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
            {loading
              ? activeMode.loadingLabel
              : formatVisibleCount({
                listedCount: listedPoints.length,
                loadingMore: isLoadingMorePoints,
                totalCount: totalPoints,
                totalKind: totalPointsKind
              })}
          </p>
        </div>
      </div>

      <div className="search-row">
        <Search className="search-icon" size={16} aria-hidden="true" />
        <input
          className="search-input"
          placeholder={activeMode.searchPlaceholder}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query ? (
          <button className="search-clear" type="button" aria-label="Clear search" onClick={() => onQueryChange("")}>
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <ProviderNotice message={providerError} />
      <FilterControls
        activeMode={activeMode}
        countries={countries}
        selectedCountry={selectedCountry}
        showListedOnGlobe={showListedOnGlobe}
        sortId={sortId}
        onCountryFilterChange={onCountryFilterChange}
        onClearCountrySelection={onClearCountrySelection}
        onSortChange={onSortChange}
        onToggleShowListedOnGlobe={onToggleShowListedOnGlobe}
      />

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
            disabled={isLoadingMorePoints}
            type="button"
            onClick={() => {
              if (onLoadMoreRemotePoints) {
                onLoadMoreRemotePoints();
              }
            }}
          >
            {isLoadingMorePoints ? "Loading" : "Show 50 more"}
          </button>
        ) : null}
      </div>
    </>
  );
}

function FilterControls({
  activeMode,
  countries,
  selectedCountry,
  showListedOnGlobe,
  sortId,
  onCountryFilterChange,
  onClearCountrySelection,
  onSortChange,
  onToggleShowListedOnGlobe
}: {
  activeMode: TerraMode;
  countries: CountryInfo[];
  selectedCountry: CountryInfo | null;
  showListedOnGlobe: boolean;
  sortId: string;
  onCountryFilterChange: (country: CountryInfo | null) => void;
  onClearCountrySelection: () => void;
  onSortChange: (sortId: string) => void;
  onToggleShowListedOnGlobe: () => void;
}) {
  return (
    <div className="filter-panel">
      <label className="filter-field">
        <span>Country</span>
        <select
          value={selectedCountry?.code ?? ""}
          onChange={(event) => onCountryFilterChange(findCountryByCode(event.target.value))}
        >
          <option value="">All countries</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-field">
        <span>Sort</span>
        <select value={sortId} onChange={(event) => onSortChange(event.target.value)}>
          {activeMode.sortOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="filter-actions">
        {selectedCountry ? (
          <button className="filter-chip" type="button" onClick={onClearCountrySelection}>
            {selectedCountry.name}
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
        <button
          aria-pressed={showListedOnGlobe}
          className={`listed-globe-toggle ${showListedOnGlobe ? "active" : ""}`}
          type="button"
          onClick={onToggleShowListedOnGlobe}
        >
          <Globe2 size={15} aria-hidden="true" />
          Listed on globe
        </button>
      </div>
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

function formatVisibleCount({
  listedCount,
  loadingMore,
  totalCount,
  totalKind
}: {
  listedCount: number;
  loadingMore: boolean;
  totalCount: number;
  totalKind: "exact" | "lowerBound";
}) {
  if (totalCount === 0 && listedCount === 0) {
    return "0 visible points";
  }

  if (totalKind === "lowerBound") {
    return loadingMore
      ? `${listedCount} listed, loading more`
      : `${listedCount} listed, more available`;
  }

  return `${listedCount} listed from ${totalCount} stations`;
}
