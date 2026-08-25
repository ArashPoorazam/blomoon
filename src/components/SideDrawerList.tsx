"use client";

import { ChevronDown, Globe2, LoaderCircle, Search, Star, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { formatDateTime, getKnownCountries, type CountryInfo } from "@/lib/geo";
import type { TerraMode, TerraModeId, TerraPoint } from "@/lib/modes/types";
import { FavouriteStarButton } from "./favourites/FavouriteStarButton";

type SideDrawerListProps = {
  activeMode: TerraMode;
  activeModeId: TerraModeId;
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
          <button className="drawer-favourites-button" type="button" onClick={onOpenFavourites}>
            <Star size={14} aria-hidden="true" />
            Favourites
          </button>
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
        hasMorePoints={hasMorePoints}
        isLoadingMorePoints={isLoadingMorePoints}
        selectedCountry={selectedCountry}
        showListedOnGlobe={showListedOnGlobe}
        sortId={sortId}
        onCountryFilterChange={onCountryFilterChange}
        onClearCountrySelection={onClearCountrySelection}
        onLoadMoreRemotePoints={onLoadMoreRemotePoints}
        onSortChange={onSortChange}
        onToggleShowListedOnGlobe={onToggleShowListedOnGlobe}
      />

      <div className="point-list">
        {points.length === 0 ? (
          <div className="empty-state">{loading ? activeMode.loadingLabel : activeMode.emptyLabel}</div>
        ) : (
          listedPoints.map((point) => (
            <div
              className={`point-row ${selectedId === point.id ? "selected" : ""}`}
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

function FilterControls({
  activeMode,
  countries,
  hasMorePoints,
  isLoadingMorePoints,
  selectedCountry,
  showListedOnGlobe,
  sortId,
  onCountryFilterChange,
  onClearCountrySelection,
  onLoadMoreRemotePoints,
  onSortChange,
  onToggleShowListedOnGlobe
}: {
  activeMode: TerraMode;
  countries: CountryInfo[];
  hasMorePoints: boolean;
  isLoadingMorePoints: boolean;
  selectedCountry: CountryInfo | null;
  showListedOnGlobe: boolean;
  sortId: string;
  onCountryFilterChange: (country: CountryInfo | null) => void;
  onClearCountrySelection: () => void;
  onLoadMoreRemotePoints?: () => void;
  onSortChange: (sortId: string) => void;
  onToggleShowListedOnGlobe: () => void;
}) {
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const countryMenuId = useId();
  const sortMenuId = useId();
  const selectedSort = activeMode.sortOptions.find((option) => option.id === sortId) ?? activeMode.sortOptions[0];
  const filteredCountries = useMemo(() => {
    const terms = countryQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);

    if (terms.length === 0) {
      return countries;
    }

    return countries.filter((country) => {
      const searchValue = `${country.name} ${country.code}`.toLowerCase();
      return terms.every((term) => searchValue.includes(term));
    });
  }, [countries, countryQuery]);

  function selectCountry(country: CountryInfo | null) {
    onCountryFilterChange(country);
    setCountryMenuOpen(false);
  }

  function selectSort(nextSortId: string) {
    onSortChange(nextSortId);
    setSortMenuOpen(false);
  }

  return (
    <div className="filter-panel">
      <div className="filter-grid">
        <div
          className="filter-menu-field"
          onBlur={(event) => {
            const nextTarget = event.relatedTarget;

            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
              setCountryMenuOpen(false);
            }
          }}
        >
          <span className="filter-label">Country</span>
          <button
            aria-controls={countryMenuId}
            aria-expanded={countryMenuOpen}
            className="filter-menu-trigger"
            type="button"
            onClick={() => setCountryMenuOpen((open) => !open)}
          >
            <span>{selectedCountry?.name ?? "All countries"}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {countryMenuOpen ? (
            <div className="filter-menu country-menu" id={countryMenuId}>
              <div className="filter-menu-search">
                <Search size={14} aria-hidden="true" />
                <input
                  autoFocus
                  placeholder="Search countries"
                  type="search"
                  value={countryQuery}
                  onChange={(event) => setCountryQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setCountryMenuOpen(false);
                    }
                  }}
                />
              </div>
              <div className="filter-menu-options">
                <button
                  className={!selectedCountry ? "selected" : ""}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCountry(null)}
                >
                  All countries
                </button>
                {filteredCountries.map((country) => (
                  <button
                    className={selectedCountry?.code === country.code ? "selected" : ""}
                    key={country.code}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectCountry(country)}
                  >
                    {country.name}
                  </button>
                ))}
                {filteredCountries.length === 0 ? (
                  <div className="filter-menu-empty">No countries found</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="filter-menu-field"
          onBlur={(event) => {
            const nextTarget = event.relatedTarget;

            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
              setSortMenuOpen(false);
            }
          }}
        >
          <span className="filter-label">Sort</span>
          <button
            aria-controls={sortMenuId}
            aria-expanded={sortMenuOpen}
            className="filter-menu-trigger"
            type="button"
            onClick={() => setSortMenuOpen((open) => !open)}
          >
            <span>{selectedSort?.label ?? "Sort"}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {sortMenuOpen ? (
            <div className="filter-menu sort-menu" id={sortMenuId}>
              <div className="filter-menu-options">
                {activeMode.sortOptions.map((option) => (
                  <button
                    className={option.id === sortId ? "selected" : ""}
                    key={option.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSort(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

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
          Display on globe
        </button>
        {hasMorePoints ? (
          <LoadMoreButton
            className="filter-load-more"
            isLoading={isLoadingMorePoints}
            onLoadMore={onLoadMoreRemotePoints}
          />
        ) : null}
      </div>
    </div>
  );
}

function LoadMoreButton({
  className,
  isLoading,
  onLoadMore
}: {
  className: string;
  isLoading: boolean;
  onLoadMore?: () => void;
}) {
  return (
    <button
      className={className}
      disabled={isLoading}
      type="button"
      onClick={() => {
        if (onLoadMore) {
          onLoadMore();
        }
      }}
    >
      {isLoading ? (
        <>
          <LoaderCircle className="loading-status-icon spinning" size={14} aria-hidden="true" />
          Loading
        </>
      ) : (
        "Show 50 more"
      )}
    </button>
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
      : `${listedCount} listed, ${totalCount}+ available`;
  }

  return `${listedCount} listed, ${totalCount} available`;
}
