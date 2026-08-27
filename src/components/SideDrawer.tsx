"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDateTime, type CountryInfo } from "@/lib/geo";
import type { TerraMode, TerraModeId, TerraPoint, TerraPointDetail } from "@/lib/modes/types";
import type { FavouriteGroupDto } from "@/lib/persistence/types";
import { FavouritesDrawer } from "./favourites/FavouritesDrawer";
import { SideDrawerList } from "./SideDrawerList";

type SideDrawerProps = {
  activeMode: TerraMode;
  activePlaybackPointKey: string | null;
  collapsed: boolean;
  detail: TerraPointDetail | null;
  detailAccessory?: React.ReactNode;
  favouritePointIds: Set<string>;
  favouriteGroups: FavouriteGroupDto[];
  favouritesLoading: boolean;
  hasMoreRemotePoints?: boolean;
  isLoadingDrawerTask: boolean;
  loading: boolean;
  loadingTaskLabel: string;
  loadingMoreRemotePoints?: boolean;
  points: TerraPoint[];
  providerError: string | null;
  query: string;
  selectedCountry: CountryInfo | null;
  selectedId: string | null;
  showListedOnGlobe: boolean;
  sortId: string;
  totalPoints: number;
  totalPointsKind: "exact" | "lowerBound";
  view: "list" | "favourites";
  onCountryFilterChange: (country: CountryInfo | null) => void;
  onClearCountrySelection: () => void;
  onClearSelection: () => void;
  onCloseFavourites: () => void;
  onFavouriteSelect: (modeId: TerraModeId, point: TerraPoint) => void;
  onLoadMoreRemotePoints?: () => void;
  onPointSelect: (point: TerraPoint) => void;
  onQueryChange: (value: string) => void;
  onSortChange: (sortId: string) => void;
  onToggleFavourite: (point: TerraPoint) => void;
  onToggleCollapsed: () => void;
  onToggleShowListedOnGlobe: () => void;
};

export function SideDrawer({
  activeMode,
  activePlaybackPointKey,
  collapsed,
  detail,
  detailAccessory,
  favouritePointIds,
  favouriteGroups,
  favouritesLoading,
  hasMoreRemotePoints,
  isLoadingDrawerTask,
  loading,
  loadingTaskLabel,
  loadingMoreRemotePoints,
  points,
  providerError,
  query,
  selectedCountry,
  selectedId,
  showListedOnGlobe,
  sortId,
  totalPoints,
  totalPointsKind,
  view,
  onCountryFilterChange,
  onClearCountrySelection,
  onClearSelection,
  onCloseFavourites,
  onFavouriteSelect,
  onLoadMoreRemotePoints,
  onPointSelect,
  onQueryChange,
  onSortChange,
  onToggleFavourite,
  onToggleCollapsed,
  onToggleShowListedOnGlobe
}: SideDrawerProps) {
  const isDetail = Boolean(selectedId);
  const isFavourites = !isDetail && view === "favourites";

  return (
    <aside className={`drawer ${collapsed ? "collapsed" : ""}`} aria-label={`${activeMode.label} data`}>
      <DrawerLoadingStatus active={isLoadingDrawerTask} label={loadingTaskLabel} />

      <button
        aria-label={collapsed ? "Open drawer" : "Close drawer"}
        className="drawer-toggle"
        type="button"
        onClick={onToggleCollapsed}
      >
        {collapsed ? <ChevronLeft size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
      </button>

      <div className="drawer-inner">
        {isDetail ? (
          <DetailView
            activeMode={activeMode}
            detail={detail}
            detailAccessory={detailAccessory}
            onClearSelection={onClearSelection}
          />
        ) : isFavourites ? (
          <FavouritesDrawer
            activePlaybackPointKey={activePlaybackPointKey}
            groups={favouriteGroups}
            loading={favouritesLoading}
            showOnGlobe={showListedOnGlobe}
            onBackToList={onCloseFavourites}
            onFavouriteSelect={onFavouriteSelect}
            onToggleFavourite={onToggleFavourite}
            onToggleShowOnGlobe={onToggleShowListedOnGlobe}
          />
        ) : (
          <SideDrawerList
            activeMode={activeMode}
            activePlaybackPointKey={activePlaybackPointKey}
            favouritePointIds={favouritePointIds}
            hasMoreRemotePoints={hasMoreRemotePoints}
            loading={loading}
            loadingMoreRemotePoints={loadingMoreRemotePoints}
            points={points}
            providerError={providerError}
            query={query}
            selectedCountry={selectedCountry}
            selectedId={selectedId}
            showListedOnGlobe={showListedOnGlobe}
            sortId={sortId}
            totalPoints={totalPoints}
            totalPointsKind={totalPointsKind}
            onCountryFilterChange={onCountryFilterChange}
            onClearCountrySelection={onClearCountrySelection}
            onLoadMoreRemotePoints={onLoadMoreRemotePoints}
            onPointSelect={onPointSelect}
            onQueryChange={onQueryChange}
            onSortChange={onSortChange}
            onToggleFavourite={onToggleFavourite}
            onToggleShowListedOnGlobe={onToggleShowListedOnGlobe}
          />
        )}
      </div>
    </aside>
  );
}

function DrawerLoadingStatus({ active, label }: { active: boolean; label: string }) {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"loading" | "complete">("loading");

  useEffect(() => {
    if (active) {
      setVisible(true);
      setStatus("loading");
      return;
    }

    setStatus("complete");
    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [active]);

  if (!visible) {
    return null;
  }

  return (
    <div className={`drawer-loading-panel ${status}`} role="status" aria-live="polite">
      {status === "loading" ? (
        <LoaderCircle className="drawer-loading-icon spinning" size={18} aria-hidden="true" />
      ) : (
        <CheckCircle2 className="drawer-loading-icon" size={18} aria-hidden="true" />
      )}
      <span>{status === "loading" ? label : "Loaded"}</span>
    </div>
  );
}

function DetailView({
  activeMode,
  detail,
  detailAccessory,
  onClearSelection
}: {
  activeMode: TerraMode;
  detail: TerraPointDetail | null;
  detailAccessory?: React.ReactNode;
  onClearSelection: () => void;
}) {
  return (
    <>
      <div className="drawer-header">
        <div>
          <div className="drawer-kicker">Blomoon · {activeMode.label}</div>
          <h1 className="drawer-title">{detail?.name ?? "Loading"}</h1>
          <p className="drawer-subtitle">{detail?.summary ?? ""}</p>
        </div>
        <button className="icon-button" type="button" aria-label="Back to list" onClick={onClearSelection}>
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      <div className="detail-body">
        {detailAccessory ? <div className="detail-accessory">{detailAccessory}</div> : null}

        <div className="detail-sections">
          {getDetailSections(detail, activeMode).map((section) => (
            <div className="detail-section" key={section.title}>
              <div className="detail-section-title">{section.title}</div>
              <div className="detail-grid">
                {section.fields.map((field) => (
                  <div className="detail-stat" key={field.label}>
                    <div className="detail-label">{field.label}</div>
                    <div className="detail-value">{field.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {detail?.sourceUrl ? (
          <a className="detail-link" href={detail.sourceUrl} target="_blank" rel="noreferrer">
            Source record
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </>
  );
}

type DetailField = {
  label: string;
  value: string;
};

type DetailSection = {
  fields: DetailField[];
  title: string;
};

function getDetailSections(detail: TerraPointDetail | null, activeMode: TerraMode): DetailSection[] {
  if (!detail) {
    return [
      {
        title: "Station",
        fields: [
          { label: activeMode.markerMetricLabel, value: "Loading" },
          { label: "Time", value: "Loading" }
        ]
      }
    ];
  }

  const fieldValue = getDetailFieldValue(detail);

  return [
    {
      title: "Station",
      fields: [
        { label: "Country", value: fieldValue("Country") },
        { label: "Language", value: fieldValue("Language") },
        { label: "Tags", value: fieldValue("Tags") }
      ]
    },
    {
      title: "Stream",
      fields: [
        { label: "Codec", value: fieldValue("Codec") },
        { label: "Bitrate", value: fieldValue("Bitrate") }
      ]
    },
    {
      title: "Activity",
      fields: [
        { label: activeMode.markerMetricLabel, value: getMetricValue(detail, activeMode.markerMetricLabel, "Unknown") },
        { label: "Votes", value: fieldValue("Votes") },
        { label: "Last checked", value: formatCheckedDateTime(detail.timestamp) }
      ]
    },
    {
      title: "Location",
      fields: [
        { label: "Latitude", value: detail.latitude.toFixed(3) },
        { label: "Longitude", value: detail.longitude.toFixed(3) }
      ]
    }
  ].map((section) => ({
    ...section,
    fields: section.fields.filter((field) => field.value !== "Unknown" && field.value !== "Untagged")
  })).filter((section) => section.fields.length > 0);
}

function getDetailFieldValue(detail: TerraPointDetail) {
  const fields = new Map(detail.fields.map((field) => [field.label, field.value]));

  return (label: string) => fields.get(label) ?? getMetricValue(detail, label, "Unknown");
}

function getMetricValue(point: TerraPoint, label: string, fallback = "?") {
  const value = point.metrics?.[label];
  return value === undefined || value === null ? fallback : String(value);
}

function formatCheckedDateTime(value?: string) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  return [
    new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date),
    new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(date)
  ].join("\n");
}
