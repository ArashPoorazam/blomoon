"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DataSourceInfo, TerraDataset, TerraMode, TerraPoint, TerraPointDetail } from "./types";

export type ModeDatasetState = {
  detail: TerraPointDetail | null;
  loading: boolean;
  points: TerraPoint[];
  providerError: string | null;
  query: string;
  selectedId: string | null;
  selectedPoint: TerraPoint | null;
  source: DataSourceInfo | null;
  visiblePoints: TerraPoint[];
  clearSelection: () => void;
  selectPoint: (point: TerraPoint) => void;
  setQuery: (value: string) => void;
};

export function useModeDataset(mode: TerraMode, selectedCountryCode: string | null): ModeDatasetState {
  const [points, setPoints] = useState<TerraPoint[]>([]);
  const [source, setSource] = useState<DataSourceInfo | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TerraPointDetail | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPoints() {
      setLoading(true);
      setRequestError(null);
      setSelectedId(null);
      setDetail(null);
      setQuery("");

      try {
        const response = await fetch(mode.dataEndpoint);

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const dataset = (await response.json()) as TerraDataset;

        if (!cancelled) {
          setPoints(dataset.points);
          setSource(dataset.source);
        }
      } catch {
        if (!cancelled) {
          setPoints([]);
          setSource(null);
          setRequestError(`${mode.label} data is unavailable.`);
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
  }, [mode]);

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
        const response = await fetch(mode.detailEndpoint(selectedId));

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
  }, [mode, points, selectedId]);

  const visiblePoints = useMemo(() => {
    const matchingPoints = points.filter((point) => (
      mode.matchPoint(point, query) &&
      (!selectedCountryCode || mode.matchCountry(point, selectedCountryCode))
    ));
    return mode.sortPoints(matchingPoints);
  }, [mode, points, query, selectedCountryCode]);

  const selectedPoint = points.find((point) => point.id === selectedId) ?? null;
  const providerError = requestError ?? (source?.isFallback ? mode.fallbackNotice : null);
  const clearSelection = useCallback(() => setSelectedId(null), []);
  const selectPoint = useCallback((point: TerraPoint) => setSelectedId(point.id), []);

  return {
    detail,
    loading,
    points,
    providerError,
    query,
    selectedId,
    selectedPoint,
    source,
    visiblePoints,
    clearSelection,
    selectPoint,
    setQuery
  };
}
