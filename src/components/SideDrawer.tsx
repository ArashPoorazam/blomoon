"use client";

import { ExternalLink, Search, X } from "lucide-react";
import type { DataSourceInfo, TerraPoint, TerraPointDetail } from "@/lib/modes/types";
import { formatCoordinate, formatDateTime } from "@/lib/geo";

type SideDrawerProps = {
  collapsed: boolean;
  detail: TerraPointDetail | null;
  error: string | null;
  points: TerraPoint[];
  query: string;
  selectedId: string | null;
  source: DataSourceInfo | null;
  onClearSelection: () => void;
  onPointSelect: (point: TerraPoint) => void;
  onQueryChange: (value: string) => void;
  onToggleCollapsed: () => void;
};

export function SideDrawer({
  collapsed,
  detail,
  error,
  points,
  query,
  selectedId,
  source,
  onClearSelection,
  onPointSelect,
  onQueryChange,
  onToggleCollapsed
}: SideDrawerProps) {
  const isDetail = Boolean(selectedId);

  return (
    <aside className={`drawer ${collapsed ? "collapsed" : ""}`} aria-label="Earthquake data">
      <button
        aria-label={collapsed ? "Open drawer" : "Close drawer"}
        className="drawer-toggle"
        type="button"
        onClick={onToggleCollapsed}
      >
        {collapsed ? "<<" : ">>"}
      </button>

      <div className="drawer-inner">
        {isDetail ? (
          <DetailView detail={detail} onClearSelection={onClearSelection} />
        ) : (
          <ListView
            error={error}
            points={points}
            query={query}
            selectedId={selectedId}
            source={source}
            onPointSelect={onPointSelect}
            onQueryChange={onQueryChange}
          />
        )}
      </div>
    </aside>
  );
}

function ListView({
  error,
  points,
  query,
  selectedId,
  source,
  onPointSelect,
  onQueryChange
}: {
  error: string | null;
  points: TerraPoint[];
  query: string;
  selectedId: string | null;
  source: DataSourceInfo | null;
  onPointSelect: (point: TerraPoint) => void;
  onQueryChange: (value: string) => void;
}) {
  return (
    <>
      <div className="drawer-header">
        <div>
          <div className="drawer-kicker">Earthquakes</div>
          <h1 className="drawer-title">Latest activity</h1>
          <p className="drawer-subtitle">
            {source?.attribution ?? "USGS earthquake data"} {error ? error : ""}
          </p>
        </div>
      </div>

      <div className="search-row">
        <Search size={16} aria-hidden="true" />
        <input
          className="search-input"
          placeholder="Filter by place or magnitude"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      <div className="point-list">
        {points.length === 0 ? (
          <div className="empty-state">No matching earthquakes.</div>
        ) : (
          points.map((point) => (
            <button
              className={`point-row ${selectedId === point.id ? "selected" : ""}`}
              key={point.id}
              type="button"
              onClick={() => onPointSelect(point)}
            >
              <span>
                <span className="point-name">{point.name}</span>
                <span className="point-meta">
                  {formatDateTime(point.timestamp)} · {formatCoordinate(point.latitude, "N", "S")},{" "}
                  {formatCoordinate(point.longitude, "E", "W")}
                </span>
              </span>
              <span className="magnitude">M {point.metrics?.Magnitude ?? "?"}</span>
            </button>
          ))
        )}
      </div>
    </>
  );
}

function DetailView({
  detail,
  onClearSelection
}: {
  detail: TerraPointDetail | null;
  onClearSelection: () => void;
}) {
  return (
    <>
      <div className="drawer-header">
        <div>
          <div className="drawer-kicker">Selected point</div>
          <h1 className="drawer-title">{detail?.name ?? "Loading"}</h1>
          <p className="drawer-subtitle">{detail?.summary ?? ""}</p>
        </div>
        <button className="icon-button" type="button" aria-label="Back to list" onClick={onClearSelection}>
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      <div className="detail-body">
        <div className="detail-grid">
          {(detail?.fields.length ? detail.fields : fallbackFields(detail)).map((field) => (
            <div className="detail-stat" key={field.label}>
              <div className="detail-label">{field.label}</div>
              <div className="detail-value">{field.value}</div>
            </div>
          ))}
        </div>

        {detail?.sourceUrl ? (
          <a className="detail-link" href={detail.sourceUrl} target="_blank" rel="noreferrer">
            USGS event
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </>
  );
}

function fallbackFields(detail: TerraPointDetail | null) {
  if (!detail) {
    return [
      { label: "Magnitude", value: "Loading" },
      { label: "Time", value: "Loading" }
    ];
  }

  return [
    { label: "Magnitude", value: String(detail.metrics?.Magnitude ?? "Unknown") },
    { label: "Latitude", value: detail.latitude.toFixed(3) },
    { label: "Longitude", value: detail.longitude.toFixed(3) },
    { label: "Time", value: formatDateTime(detail.timestamp) }
  ];
}
