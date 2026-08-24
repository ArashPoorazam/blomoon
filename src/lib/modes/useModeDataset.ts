"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DataSourceInfo, TerraDataset, TerraMode, TerraPoint, TerraPointDetail, TerraPointPage } from "./types";

const LIST_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 250;

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
  totalVisiblePointsKind: TerraPointPage["totalKind"];
  visiblePoints: TerraPoint[];
  clearSelection: () => void;
  loadMoreVisiblePoints: () => void;
  selectPoint: (point: TerraPoint) => void;
  setQuery: (value: string) => void;
};

export function useModeDataset(
  mode: TerraMode,
  selectedCountryCode: string | null,
  initialDataset?: TerraDataset
): ModeDatasetState {
  const initialModeDataset = getInitialDataset(mode, initialDataset);
  const [points, setPoints] = useState<TerraPoint[]>(() => initialModeDataset?.points ?? []);
  const [source, setSource] = useState<DataSourceInfo | null>(() => initialModeDataset?.source ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TerraPointDetail | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(() => !initialModeDataset);
  const [refreshingLivePoints, setRefreshingLivePoints] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [countryMarkerPoints, setCountryMarkerPoints] = useState<TerraPoint[]>([]);
  const [countryPagePoints, setCountryPagePoints] = useState<TerraPoint[]>([]);
  const [countryNextOffset, setCountryNextOffset] = useState<number | null>(null);
  const [countrySource, setCountrySource] = useState<DataSourceInfo | null>(null);
  const [countryTotal, setCountryTotal] = useState(0);
  const [countryTotalKind, setCountryTotalKind] = useState<TerraPointPage["totalKind"]>("exact");
  const [countryListLoading, setCountryListLoading] = useState(false);
  const [countryRequestError, setCountryRequestError] = useState<string | null>(null);
  const [loadingMoreVisiblePoints, setLoadingMoreVisiblePoints] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function loadPoints() {
      const seededDataset = getInitialDataset(mode, initialDataset);

      setLoading(!seededDataset);
      setRequestError(null);
      setSelectedId(null);
      setDetail(null);
      setQuery("");
      setDebouncedQuery("");
      setPoints(seededDataset?.points ?? []);
      setSource(seededDataset?.source ?? null);
      setRefreshingLivePoints(Boolean(seededDataset));

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
        if (!cancelled && !seededDataset) {
          setPoints([]);
          setSource(null);
          setRequestError(`${mode.label} data is unavailable.`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshingLivePoints(false);
        }
      }
    }

    void loadPoints();

    return () => {
      cancelled = true;
    };
  }, [initialDataset, mode]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadCountryMarkers() {
      if (!selectedCountryCode || !mode.countryCatalog) {
        setCountryMarkerPoints([]);
        setCountrySource(null);
        setCountryRequestError(null);
        return;
      }

      setCountryRequestError(null);

      try {
        const response = await fetch(mode.countryCatalog.markerEndpoint(selectedCountryCode), {
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const dataset = (await response.json()) as TerraDataset;

        if (!cancelled) {
          setCountryMarkerPoints(dataset.points);
          setCountrySource(dataset.source);
        }
      } catch (error) {
        if (!cancelled && !isAbortError(error)) {
          setCountryMarkerPoints([]);
          setCountryRequestError(`${mode.label} country markers are unavailable.`);
        }
      }
    }

    void loadCountryMarkers();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [mode, selectedCountryCode]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadCountryPages() {
      const countryCatalog = mode.countryCatalog;

      if (!selectedCountryCode || !countryCatalog) {
        setCountryPagePoints([]);
        setCountryNextOffset(null);
        setCountrySource(null);
        setCountryTotal(0);
        setCountryTotalKind("exact");
        setCountryListLoading(false);
        setLoadingMoreVisiblePoints(false);
        setCountryRequestError(null);
        return;
      }

      setCountryListLoading(true);
      setLoadingMoreVisiblePoints(false);
      setCountryRequestError(null);
      setCountryPagePoints([]);
      setCountryNextOffset(null);
      setCountryTotal(0);
      setCountryTotalKind("exact");

      try {
        const firstPage = await fetchPointPage(countryCatalog.searchEndpoint(selectedCountryCode, {
          limit: LIST_PAGE_SIZE,
          offset: 0,
          query: debouncedQuery
        }), controller.signal);

        if (!cancelled) {
          setCountryPagePoints(firstPage.points);
          setCountryNextOffset(firstPage.nextOffset);
          setCountrySource(firstPage.source);
          setCountryTotal(firstPage.total);
          setCountryTotalKind(firstPage.totalKind);
          setCountryListLoading(false);
        }

        let nextOffset = firstPage.nextOffset;

        if (nextOffset !== null && !cancelled) {
          setLoadingMoreVisiblePoints(true);
        }

        while (nextOffset !== null && !cancelled) {
          const nextPage = await fetchPointPage(countryCatalog.searchEndpoint(selectedCountryCode, {
            limit: LIST_PAGE_SIZE,
            offset: nextOffset,
            query: debouncedQuery
          }), controller.signal);

          if (cancelled) {
            return;
          }

          setCountryPagePoints((currentPoints) => mergePoints(currentPoints, nextPage.points));
          setCountryNextOffset(nextPage.nextOffset);
          setCountrySource(nextPage.source);
          setCountryTotal(nextPage.total);
          setCountryTotalKind(nextPage.totalKind);
          nextOffset = nextPage.nextOffset;
        }
      } catch (error) {
        if (!cancelled && !isAbortError(error)) {
          setCountryRequestError(`${mode.label} country stations are unavailable.`);
        }
      } finally {
        if (!cancelled) {
          setCountryListLoading(false);
          setLoadingMoreVisiblePoints(false);
        }
      }
    }

    void loadCountryPages();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedQuery, mode, selectedCountryCode]);

  const allKnownPoints = useMemo(
    () => mergePoints(points, countryMarkerPoints, countryPagePoints),
    [countryMarkerPoints, countryPagePoints, points]
  );
  const selectedPoint = useMemo(
    () => allKnownPoints.find((point) => point.id === selectedId) ?? null,
    [allKnownPoints, selectedId]
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadDetail() {
      if (!selectedId) {
        setDetail(null);
        return;
      }

      if (selectedPoint) {
        setDetail({
          ...selectedPoint,
          fields: []
        });
      }

      try {
        const response = await fetch(mode.detailEndpoint(selectedId), {
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const nextDetail = (await response.json()) as TerraPointDetail;

        if (!cancelled) {
          setDetail(nextDetail);
        }
      } catch (error) {
        if (!cancelled && !isAbortError(error) && selectedPoint) {
          setDetail({
            ...selectedPoint,
            fields: []
          });
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [mode, selectedId]);

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
      ? mergePoints(points, countryMarkerPoints, selectedPoint ? [selectedPoint] : [])
      : points,
    [countryMarkerPoints, mode.countryCatalog, points, selectedCountryCode, selectedPoint]
  );
  const providerError = requestError
    ?? countryRequestError
    ?? (countrySource?.isFallback || (!refreshingLivePoints && source?.isFallback) ? mode.fallbackNotice : null);
  const hasMoreVisiblePoints = Boolean(selectedCountryCode && mode.countryCatalog && countryNextOffset !== null);
  const totalVisiblePoints = selectedCountryCode && mode.countryCatalog ? countryTotal : visiblePoints.length;
  const totalVisiblePointsKind = selectedCountryCode && mode.countryCatalog ? countryTotalKind : "exact";
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
      query: debouncedQuery
    });

    async function loadNextPage() {
      setLoadingMoreVisiblePoints(true);
      setCountryRequestError(null);

      try {
        const page = await fetchPointPage(endpoint);

        setCountryPagePoints((currentPoints) => mergePoints(currentPoints, page.points));
        setCountryNextOffset(page.nextOffset);
        setCountrySource(page.source);
        setCountryTotal(page.total);
        setCountryTotalKind(page.totalKind);
      } catch {
        setCountryRequestError(`${mode.label} country stations are unavailable.`);
      } finally {
        setLoadingMoreVisiblePoints(false);
      }
    }

    void loadNextPage();
  }, [countryNextOffset, debouncedQuery, loadingMoreVisiblePoints, mode, selectedCountryCode]);
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
    totalVisiblePointsKind,
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

function getInitialDataset(mode: TerraMode, initialDataset?: TerraDataset) {
  return initialDataset?.modeId === mode.id ? initialDataset : null;
}

async function fetchPointPage(endpoint: string, signal?: AbortSignal) {
  const response = await fetch(endpoint, {
    cache: "no-store",
    signal
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as TerraPointPage;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
