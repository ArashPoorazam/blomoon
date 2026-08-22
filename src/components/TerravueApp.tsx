"use client";

import { Activity } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

  return (
    <main className="terravue-shell">
      <div className="globe-stage">
        <GlobeScene
          points={filteredPoints}
          selectedPoint={selectedPoint}
          onPointSelect={(point) => {
            setSelectedId(point.id);
            setDrawerCollapsed(false);
          }}
        />
      </div>

      <div className="brand-bar" aria-label="Terravue">
        <div className="brand-mark" aria-hidden="true" />
        <div className="brand-copy">
          <div className="brand-title">Terravue</div>
          <div className="brand-mode">{filteredPoints.length} visible points</div>
        </div>
      </div>

      <div className="mode-bar" aria-label="Mode switcher">
        <button className="mode-button" type="button" aria-pressed="true">
          <Activity size={16} aria-hidden="true" />
          Earthquakes
        </button>
      </div>

      {source ? (
        <div className="source-pill">
          {source.name} · Updated {new Date(source.lastUpdated).toLocaleString()}
          {source.isFallback ? " · Fallback data" : ""}
        </div>
      ) : null}

      {loading ? (
        <div className="loading-layer">
          <div className="loading-pill">Loading earthquakes</div>
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
        onPointSelect={(point) => {
          setSelectedId(point.id);
          setDrawerCollapsed(false);
        }}
        onQueryChange={setQuery}
        onToggleCollapsed={() => setDrawerCollapsed((value) => !value)}
      />
    </main>
  );
}
