"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DataSourceInfo, TerraDataset, TerraMode, TerraPoint, TerraPointDetail, TerraPointPage } from "./types";

const LIST_PAGE_SIZE = 50;

export type ModeDatasetState = {
  detail: TerraPointDetail | null;
  globePoints: TerraPoint[];
  hasMoreVisiblePoints: boolean;
  listLoading: boolean;
  loading: boolean;
  loadingMoreVisiblePoints: boolean;
  points: TerraPoint[];
  providerError: string | null;
  query: string;
  selectedId: string | null;
  selectedPoint: TerraPoint | null;
  source: DataSourceInfo | null;
  totalVisiblePoints: number;
  visiblePoints: TerraPoint[];
  clearSelection: () => void;
  loadMoreVisiblePoints: () => void;
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
  const [countryMarkerPoints, setCountryMarkerPoints] = useState<TerraPoint[]>([]);
  const [countryPagePoints, setCountryPagePoints] = useState<TerraPoint[]>([]);
  const [countryNextOffset, setCountryNextOffset] = useState<number | null>(null);
  const [countryTotal, setCountryTotal] = useState(0);
  const [countryListLoading, setCountryListLoading] = useState(false);
  const [countryRequestError, setCountryRequestError] = useState<string | null>(null);
  const [loadingMoreVisiblePoints, setLoadingMoreVisiblePoints] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPoints() {
      setLoading(true);
      setRequestError(null);
      setSelectedId(null);
      setDetail(null);
      setQuery("");

      try {
        const response = await fetch(mode.dataEndpoint, { cache: "no-store" });

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

    async function loadCountryMarkers() {
      if (!selectedCountryCode || !mode.countryCatalog) {
        setCountryMarkerPoints([]);
        return;
      }

      try {
        const response = await fetch(mode.countryCatalog.markerEndpoint(selectedCountryCode), { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const dataset = (await response.json()) as TerraDataset;

        if (!cancelled) {
          setCountryMarkerPoints(dataset.points);
        }
      } catch {
        if (!cancelled) {
          setCountryMarkerPoints([]);
          setCountryRequestError(`${mode.label} country markers are unavailable.`);
        }
      }
    }

    void loadCountryMarkers();

    return () => {
      cancelled = true;
    };
  }, [mode, selectedCountryCode]);

  useEffect(() => {
    let cancelled = false;

    async function loadCountryPage() {
      if (!selectedCountryCode || !mode.countryCatalog) {
        setCountryPagePoints([]);
        setCountryNextOffset(null);
        setCountryTotal(0);
        setCountryListLoading(false);
        setCountryRequestError(null);
        return;
      }

      setCountryListLoading(true);
      setCountryRequestError(null);
      setCountryPagePoints([]);
      setCountryNextOffset(null);
      setCountryTotal(0);

      try {
        const response = await fetch(mode.countryCatalog.searchEndpoint(selectedCountryCode, {
          limit: LIST_PAGE_SIZE,
          offset: 0,
          query
        }), { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const page = (await response.json()) as TerraPointPage;

        if (!cancelled) {
          setCountryPagePoints(page.points);
          setCountryNextOffset(page.nextOffset);
          setCountryTotal(page.total);
        }
      } catch {
        if (!cancelled) {
          setCountryRequestError(`${mode.label} country stations are unavailable.`);
        }
      } finally {
        if (!cancelled) {
          setCountryListLoading(false);
        }
      }
    }

    void loadCountryPage();

    return () => {
      cancelled = true;
    };
  }, [mode, query, selectedCountryCode]);

  const allKnownPoints = useMemo(
    () => mergePoints(points, countryMarkerPoints, countryPagePoints),
    [countryMarkerPoints, countryPagePoints, points]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!selectedId) {
        setDetail(null);
        return;
      }

      const localPoint = allKnownPoints.find((point) => point.id === selectedId) ?? null;

      if (localPoint) {
        setDetail({
          ...localPoint,
          fields: []
        });
      }

      try {
        const response = await fetch(mode.detailEndpoint(selectedId), { cache: "no-store" });

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
  }, [allKnownPoints, mode, selectedId]);

  const visiblePoints = useMemo(() => {
    if (selectedCountryCode && mode.countryCatalog) {
      return countryPagePoints;
    }

    const matchingPoints = points.filter((point) => (
      mode.matchPoint(point, query) &&
      (!selectedCountryCode || mode.matchCountry(point, selectedCountryCode))
    ));
    return mode.sortPoints(matchingPoints);
  }, [countryPagePoints, mode, points, query, selectedCountryCode]);

  const globePoints = useMemo(
    () => selectedCountryCode && mode.countryCatalog
      ? mergePoints(points, countryMarkerPoints)
      : points,
    [countryMarkerPoints, mode.countryCatalog, points, selectedCountryCode]
  );
  const selectedPoint = allKnownPoints.find((point) => point.id === selectedId) ?? null;
  const providerError = requestError ?? countryRequestError ?? (source?.isFallback ? mode.fallbackNotice : null);
  const hasMoreVisiblePoints = Boolean(selectedCountryCode && mode.countryCatalog && countryNextOffset !== null);
  const totalVisiblePoints = selectedCountryCode && mode.countryCatalog ? countryTotal : visiblePoints.length;
  const clearSelection = useCallback(() => setSelectedId(null), []);
  const loadMoreVisiblePoints = useCallback(() => {
    const countryCatalog = mode.countryCatalog;
    const nextOffset = countryNextOffset;
    const countryCode = selectedCountryCode;

    if (!countryCode || !countryCatalog || nextOffset === null || loadingMoreVisiblePoints) {
      return;
    }

    const endpoint = countryCatalog.searchEndpoint(countryCode, {
      limit: LIST_PAGE_SIZE,
      offset: nextOffset,
      query
    });

    async function loadNextPage() {
      setLoadingMoreVisiblePoints(true);
      setCountryRequestError(null);

      try {
        const response = await fetch(endpoint, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const page = (await response.json()) as TerraPointPage;

        setCountryPagePoints((currentPoints) => mergePoints(currentPoints, page.points));
        setCountryNextOffset(page.nextOffset);
        setCountryTotal(page.total);
      } catch {
        setCountryRequestError(`${mode.label} country stations are unavailable.`);
      } finally {
        setLoadingMoreVisiblePoints(false);
      }
    }

    void loadNextPage();
  }, [countryNextOffset, loadingMoreVisiblePoints, mode, query, selectedCountryCode]);
  const selectPoint = useCallback((point: TerraPoint) => setSelectedId(point.id), []);

  return {
    detail,
    globePoints,
    hasMoreVisiblePoints,
    listLoading: loading || countryListLoading,
    loading,
    loadingMoreVisiblePoints,
    points,
    providerError,
    query,
    selectedId,
    selectedPoint,
    source,
    totalVisiblePoints,
    visiblePoints,
    clearSelection,
    loadMoreVisiblePoints,
    selectPoint,
    setQuery
  };
}

function mergePoints(...pointGroups: TerraPoint[][]) {
  const pointsById = new Map<string, TerraPoint>();

  pointGroups.forEach((points) => {
    points.forEach((point) => {
      pointsById.set(point.id, point);
    });
  });

  return Array.from(pointsById.values());
}
