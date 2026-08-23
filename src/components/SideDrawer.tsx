"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatDateTime, type CountryInfo } from "@/lib/geo";
import type { TerraMode, TerraModeId, TerraPoint, TerraPointDetail } from "@/lib/modes/types";

const LIST_PAGE_SIZE = 50;

type SideDrawerProps = {
  activeMode: TerraMode;
  activeModeId: TerraModeId;
  collapsed: boolean;
  detail: TerraPointDetail | null;
  detailAccessory?: React.ReactNode;
  loading: boolean;
  modes: TerraMode[];
  points: TerraPoint[];
  providerError: string | null;
  query: string;
  selectedCountry: CountryInfo | null;
  selectedId: string | null;
  totalPoints: number;
  onClearCountrySelection: () => void;
  onClearSelection: () => void;
  onModeChange: (modeId: TerraModeId) => void;
  onPointSelect: (point: TerraPoint) => void;
  onQueryChange: (value: string) => void;
  onToggleCollapsed: () => void;
};

export function SideDrawer({
  activeMode,
  activeModeId,
  collapsed,
  detail,
  detailAccessory,
  loading,
  modes,
  points,
  providerError,
  query,
  selectedCountry,
  selectedId,
  totalPoints,
  onClearCountrySelection,
  onClearSelection,
  onModeChange,
  onPointSelect,
  onQueryChange,
  onToggleCollapsed
}: SideDrawerProps) {
  const isDetail = Boolean(selectedId);

  return (
    <aside className={`drawer ${collapsed ? "collapsed" : ""}`} aria-label={`${activeMode.label} data`}>
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
        ) : (
          <ListView
            activeMode={activeMode}
            activeModeId={activeModeId}
            loading={loading}
            modes={modes}
            points={points}
            providerError={providerError}
            query={query}
            selectedCountry={selectedCountry}
            selectedId={selectedId}
            totalPoints={totalPoints}
            onClearCountrySelection={onClearCountrySelection}
            onModeChange={onModeChange}
            onPointSelect={onPointSelect}
            onQueryChange={onQueryChange}
          />
        )}
      </div>
    </aside>
  );
}

function ListView({
  activeMode,
  activeModeId,
  loading,
  modes,
  points,
  providerError,
  query,
  selectedCountry,
  selectedId,
  totalPoints,
  onClearCountrySelection,
  onModeChange,
  onPointSelect,
  onQueryChange
}: {
  activeMode: TerraMode;
  activeModeId: TerraModeId;
  loading: boolean;
  modes: TerraMode[];
  points: TerraPoint[];
  providerError: string | null;
  query: string;
  selectedCountry: CountryInfo | null;
  selectedId: string | null;
  totalPoints: number;
  onClearCountrySelection: () => void;
  onModeChange: (modeId: TerraModeId) => void;
  onPointSelect: (point: TerraPoint) => void;
  onQueryChange: (value: string) => void;
}) {
  const [visibleLimit, setVisibleLimit] = useState(LIST_PAGE_SIZE);
  const listedPoints = useMemo(() => points.slice(0, visibleLimit), [points, visibleLimit]);
  const hasMorePoints = listedPoints.length < points.length;

  useEffect(() => {
    setVisibleLimit(LIST_PAGE_SIZE);
  }, [activeModeId, query, selectedCountry?.code]);

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
            {loading ? activeMode.loadingLabel : formatVisibleCount(listedPoints.length, points.length, totalPoints)}
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
            type="button"
            onClick={() => setVisibleLimit((value) => value + LIST_PAGE_SIZE)}
          >
            Show 50 more
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
          <div className="drawer-kicker">Terravue · {activeMode.label}</div>
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
        { label: "Last checked", value: formatDateTime(detail.timestamp) }
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

function formatVisibleCount(listedCount: number, matchingCount: number, totalCount: number) {
  if (matchingCount === 0) {
    return "0 visible points";
  }

  if (matchingCount === totalCount) {
    return `${listedCount} listed of ${totalCount} points`;
  }

  return `${listedCount} listed of ${matchingCount} matching points`;
}
