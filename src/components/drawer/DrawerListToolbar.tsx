"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useId, useState } from "react";
import type { CountryInfo } from "@/lib/geo";
import type { TerraMode } from "@/lib/modes/types";
import { DrawerFilterPanel } from "./DrawerFilterPanel";
import { DrawerHeader } from "./DrawerHeader";
import { LoadMoreButton } from "./LoadMoreButton";

type DrawerListToolbarProps = {
  activeMode: TerraMode;
  hasMorePoints: boolean;
  isLoadingMorePoints: boolean;
  listedCount: number;
  loading: boolean;
  providerError: string | null;
  query: string;
  selectedCountry: CountryInfo | null;
  sortId: string;
  totalPoints: number;
  totalPointsKind: "exact" | "lowerBound";
  onCountryFilterChange: (country: CountryInfo | null) => void;
  onClearCountrySelection: () => void;
  onLoadMorePoints?: () => void;
  onQueryChange: (value: string) => void;
  onSortChange: (sortId: string) => void;
};

export function DrawerListToolbar({
  activeMode,
  hasMorePoints,
  isLoadingMorePoints,
  listedCount,
  loading,
  providerError,
  query,
  selectedCountry,
  sortId,
  totalPoints,
  totalPointsKind,
  onCountryFilterChange,
  onClearCountrySelection,
  onLoadMorePoints,
  onQueryChange,
  onSortChange
}: DrawerListToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterPanelId = useId();
  const hasActiveSearch = query.trim().length > 0;
  const hasActiveFilters = Boolean(selectedCountry) || sortId !== activeMode.defaultSortId;

  return (
    <div className="drawer-list-toolbar">
      <div className="drawer-heading-copy">
        <h1 className="drawer-brand-title">Blomoon</h1>
        <p className="drawer-subtitle">{activeMode.copy.listSubtitle}</p>
      </div>
      <DrawerHeader
        className="drawer-directory-header"
        title="Directory"
        subtitle={loading
          ? activeMode.copy.loadingLabel
          : formatVisibleCount({
            listedCount,
            totalCount: totalPoints,
            totalKind: totalPointsKind
          })}
        actions={(
          <LoadMoreButton
            className="directory-load-more"
            disabled={loading || !hasMorePoints}
            isLoading={isLoadingMorePoints}
            onLoadMore={onLoadMorePoints}
          />
        )}
      />

      <div className="drawer-search-controls">
        <div className={`search-row ${hasActiveSearch ? "active" : ""}`}>
          <Search className="search-icon" size={16} aria-hidden="true" />
          <input
            className="search-input"
            placeholder={activeMode.copy.searchPlaceholder}
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
        <button
          aria-controls={filterPanelId}
          aria-expanded={filtersOpen}
          aria-label={filtersOpen ? "Hide filters" : "Show filters"}
          className={`filter-toggle ${hasActiveFilters ? "active" : ""}`}
          title={filtersOpen ? "Hide filters" : "Show filters"}
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
        </button>
      </div>

      <ProviderNotice message={providerError} />

      {filtersOpen ? (
        <div id={filterPanelId}>
          <DrawerFilterPanel
            activeMode={activeMode}
            selectedCountry={selectedCountry}
            sortId={sortId}
            onCountryFilterChange={onCountryFilterChange}
            onClearCountrySelection={onClearCountrySelection}
            onSortChange={onSortChange}
          />
        </div>
      ) : null}
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
  totalCount,
  totalKind
}: {
  listedCount: number;
  totalCount: number;
  totalKind: "exact" | "lowerBound";
}) {
  if (totalCount === 0 && listedCount === 0) {
    return "0 visible points";
  }

  const listedLabel = numberFormatter.format(listedCount);
  const totalLabel = numberFormatter.format(totalCount);

  if (totalKind === "lowerBound") {
    return `${listedLabel} listed, ${totalLabel}+ available`;
  }

  return `${listedLabel} listed, ${totalLabel} available`;
}

const numberFormatter = new Intl.NumberFormat("en");
