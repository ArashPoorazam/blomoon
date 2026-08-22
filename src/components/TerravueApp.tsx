"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCoordinate } from "@/lib/geo";
import type { DataSourceInfo, TerraDataset, TerraPoint, TerraPointDetail } from "@/lib/modes/types";
import { GlobeScene } from "./GlobeScene";
import { SideDrawer } from "./SideDrawer";

export function TerravueApp() {
  const [points, setPoints] = useState<TerraPoint[]>([]);
  const [source, setSource] = useState<DataSourceInfo | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TerraPointDetail | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<TerraPoint | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPoints() {
      try {
        setLoading(true);
        const response = await fetch("/api/modes/earthquakes/points");

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const dataset = (await response.json()) as TerraDataset;

        if (!cancelled) {
          setPoints(dataset.points);
          setSource(dataset.source);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Earthquake data is unavailable.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPoints();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!selectedId) {
        setDetail(null);
        return;
      }

      const localPoint = points.find((point) => point.id === selectedId) ?? null;

      if (localPoint) {
        setDetail({
          ...localPoint,
          fields: []
        });
      }

      try {
        const response = await fetch(`/api/modes/earthquakes/points/${encodeURIComponent(selectedId)}`);

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const nextDetail = (await response.json()) as TerraPointDetail;

        if (!cancelled) {
          setDetail(nextDetail);
        }
      } catch {
        if (!cancelled && localPoint) {
          setDetail({
            ...localPoint,
            fields: []
          });
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [points, selectedId]);

  const filteredPoints = useMemo(() => {
    const value = query.trim().toLowerCase();

    if (!value) {
      return points;
    }

    return points.filter((point) => {
      const haystack = `${point.name} ${point.summary} ${Object.values(point.metrics ?? {}).join(" ")}`.toLowerCase();
      return haystack.includes(value);
    });
  }, [points, query]);

  const selectedPoint = points.find((point) => point.id === selectedId) ?? null;
  const drawerOpen = !drawerCollapsed;

  function selectPoint(point: TerraPoint) {
    setSelectedId(point.id);
    setDrawerCollapsed(false);
  }

  return (
    <main
      className={`terravue-shell ${drawerOpen ? "drawer-open" : "drawer-closed"}`}
      onMouseMove={(event) => {
        if (tooltipRef.current) {
          tooltipRef.current.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`;
        }
      }}
    >
      <div className="globe-stage">
        <GlobeScene
          focusKey={selectedId}
          points={filteredPoints}
          selectedPoint={selectedPoint}
          onPointHover={setHoveredPoint}
          onPointSelect={selectPoint}
        />
      </div>

      {loading ? (
        <div className="loading-layer">
          <div className="loading-pill">Loading earthquakes</div>
        </div>
      ) : null}

      {hoveredPoint ? (
        <div
          ref={tooltipRef}
          className="point-tooltip"
        >
          <div className="point-tooltip-name">{hoveredPoint.name}</div>
          <div className="point-tooltip-meta">
            {formatCoordinate(hoveredPoint.latitude, "N", "S")},{" "}
            {formatCoordinate(hoveredPoint.longitude, "E", "W")}
          </div>
        </div>
      ) : null}

      <SideDrawer
        collapsed={drawerCollapsed}
        detail={detail}
        error={error}
        points={filteredPoints}
        query={query}
        selectedId={selectedId}
        source={source}
        onClearSelection={() => setSelectedId(null)}
        onPointSelect={selectPoint}
        onQueryChange={setQuery}
        onToggleCollapsed={() => setDrawerCollapsed((value) => !value)}
      />
    </main>
  );
}
