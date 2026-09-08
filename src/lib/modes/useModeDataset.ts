"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  beginModeListRefresh,
  createInitialModeListSnapshot,
  createModeListRequestKey,
  createModeListSnapshot
} from "./modeListState";
import type { DataSourceInfo, TerraDataset, TerraMode, TerraPoint, TerraPointDetail, TerraPointPage } from "./types";

const LIST_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 250;

export type ModeDatasetState = {
  detail: TerraPointDetail | null;
  globePoints: TerraPoint[];
  hasMoreVisiblePoints: boolean;
  isLoadingDrawerTask: boolean;
  listLoading: boolean;
  listSettled: boolean;
  loadedVisiblePointCount: number;
  loading: boolean;
  loadingMoreVisiblePoints: boolean;
  loadingTaskLabel: string;
  points: TerraPoint[];
  providerError: string | null;
  query: string;
  selectedId: string | null;
  selectedPoint: TerraPoint | null;
  sortId: string;
  source: DataSourceInfo | null;
  totalVisiblePoints: number;
  totalVisiblePointsKind: TerraPointPage["totalKind"];
  visiblePoints: TerraPoint[];
  clearSelection: () => void;
  loadMoreVisiblePoints: () => void;
  selectPoint: (point: TerraPoint) => void;
  setQuery: (value: string) => void;
  setSortId: (value: string) => void;
};

export function useModeDataset(
  mode: TerraMode,
  selectedCountryCode: string | null,
  initialDataset?: TerraDataset
): ModeDatasetState {
  const initialModeDataset = getInitialDataset(mode, initialDataset);
  const [points, setPoints] = useState<TerraPoint[]>(() => initialModeDataset?.points ?? []);
  const [source, setSource] = useState<DataSourceInfo | null>(() => initialModeDataset?.source ?? null);
  const [selectedPoint, setSelectedPoint] = useState<TerraPoint | null>(null);
  const [detail, setDetail] = useState<TerraPointDetail | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortId, setSortId] = useState(mode.defaultSortId);
  const [loading, setLoading] = useState(() => !initialModeDataset);
  const [refreshingLivePoints, setRefreshingLivePoints] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [countryMarkerPoints, setCountryMarkerPoints] = useState<TerraPoint[]>([]);
  const [countryMarkerLoading, setCountryMarkerLoading] = useState(false);
  const [visiblePage, setVisiblePage] = useState(() => createInitialModeListSnapshot(initialModeDataset, LIST_PAGE_SIZE));
  const [countrySource, setCountrySource] = useState<DataSourceInfo | null>(null);
  const [listLoading, setListLoading] = useState(() => !initialModeDataset);
  const [countryRequestError, setCountryRequestError] = useState<string | null>(null);
  const [listRequestError, setListRequestError] = useState<string | null>(null);
  const [loadingMoreVisiblePoints, setLoadingMoreVisiblePoints] = useState(false);
  const visibleRequestKey = createModeListRequestKey({
    countryCode: selectedCountryCode,
    modeId: mode.id,
    query: debouncedQuery,
    sortId
  });
  const visibleRequestKeyRef = useRef<string | null>(initialModeDataset && !selectedCountryCode
    ? visibleRequestKey
    : null);
  const [settledListModeId, setSettledListModeId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    setSortId(mode.defaultSortId);
  }, [mode]);

  useEffect(() => {
    let cancelled = false;

    async function loadPoints() {
      const seededDataset = getInitialDataset(mode, initialDataset);

      setLoading(!seededDataset);
      setRequestError(null);
      setSelectedPoint(null);
      setDetail(null);
      setPoints(seededDataset?.points ?? []);
      setSource(seededDataset?.source ?? null);
      setRefreshingLivePoints(Boolean(seededDataset));

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
        setCountryMarkerLoading(false);
        setCountryRequestError(null);
        return;
      }

      setCountryMarkerLoading(true);
      setCountryRequestError(null);

      try {
        const response = await fetch(mode.countryCatalog.markerEndpoint(selectedCountryCode), {
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
      } finally {
        if (!cancelled) {
          setCountryMarkerLoading(false);
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

    async function loadVisiblePoints() {
      const requestKey = createModeListRequestKey({
        countryCode: selectedCountryCode,
        modeId: mode.id,
        query: debouncedQuery,
        sortId
      });
      const currentRequestKey = visibleRequestKeyRef.current;

      setListLoading(true);
      setLoadingMoreVisiblePoints(false);
      setListRequestError(null);
      setVisiblePage((snapshot) => beginModeListRefresh({
        currentRequestKey,
        nextRequestKey: requestKey,
        snapshot
      }));
      visibleRequestKeyRef.current = requestKey;

      try {
        const firstPage = await fetchPointPage(mode.listEndpoint({
          countryCode: selectedCountryCode,
          limit: LIST_PAGE_SIZE,
          offset: 0,
          query: debouncedQuery,
          sortId
        }), controller.signal);

        if (!cancelled) {
          setVisiblePage(createModeListSnapshot(firstPage));
        }
      } catch (error) {
        if (!cancelled && !isAbortError(error)) {
          setListRequestError(`${mode.label} ${mode.copy.itemPlural} are unavailable.`);
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
          setLoadingMoreVisiblePoints(false);
          setSettledListModeId(mode.id);
        }
      }
    }

    void loadVisiblePoints();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedQuery, mode, selectedCountryCode, sortId]);

  const selectedId = selectedPoint?.id ?? null;

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

  const globePoints = useMemo(
    () => selectedCountryCode && mode.countryCatalog
      ? mergePoints(points, countryMarkerPoints, visiblePage.points, selectedPoint ? [selectedPoint] : [])
      : mergePoints(points, visiblePage.points, selectedPoint ? [selectedPoint] : []),
    [countryMarkerPoints, mode.countryCatalog, points, selectedCountryCode, selectedPoint, visiblePage.points]
  );
  const providerError = requestError
    ?? countryRequestError
    ?? listRequestError
    ?? (visiblePage.source?.isFallback || countrySource?.isFallback || (!refreshingLivePoints && source?.isFallback) ? mode.copy.fallbackNotice : null);
  const hasMoreVisiblePoints = visiblePage.nextOffset !== null;
  const totalVisiblePoints = visiblePage.total;
  const totalVisiblePointsKind = visiblePage.totalKind;
  const listSettled = settledListModeId === mode.id;
  const clearSelection = useCallback(() => setSelectedPoint(null), []);
  const loadMoreVisiblePoints = useCallback(async () => {
    if (visiblePage.nextOffset === null || loadingMoreVisiblePoints || listLoading) {
      return;
    }

    setLoadingMoreVisiblePoints(true);
    setListRequestError(null);

    try {
      const nextPage = await fetchPointPage(mode.listEndpoint({
        countryCode: selectedCountryCode,
        limit: LIST_PAGE_SIZE,
        offset: visiblePage.nextOffset,
        query: debouncedQuery,
        sortId
      }));

      setVisiblePage((currentPage) => ({
        ...createModeListSnapshot(nextPage),
        points: mergePoints(currentPage.points, nextPage.points)
      }));
    } catch {
      setVisiblePage((currentPage) => ({ ...currentPage, nextOffset: null }));
      setListRequestError(`${mode.label} ${mode.copy.itemPlural} are unavailable.`);
    } finally {
      setLoadingMoreVisiblePoints(false);
    }
  }, [debouncedQuery, listLoading, loadingMoreVisiblePoints, mode, selectedCountryCode, sortId, visiblePage.nextOffset]);
  const selectPoint = useCallback((point: TerraPoint) => setSelectedPoint(point), []);
  const isLoadingDrawerTask = loading || listLoading || loadingMoreVisiblePoints || countryMarkerLoading;

  return {
    detail,
    globePoints,
    hasMoreVisiblePoints,
    isLoadingDrawerTask,
    listLoading,
    listSettled,
    loadedVisiblePointCount: visiblePage.points.length,
    loading,
    loadingTaskLabel: getLoadingTaskLabel({
      loading,
      loadingMoreVisiblePoints,
      mode,
      query: debouncedQuery,
      selectedCountryCode
    }),
    loadingMoreVisiblePoints,
    points,
    providerError,
    query,
    selectedId,
    selectedPoint,
    sortId,
    source,
    totalVisiblePoints,
    totalVisiblePointsKind,
    visiblePoints: visiblePage.points,
    clearSelection,
    loadMoreVisiblePoints,
    selectPoint,
    setQuery,
    setSortId
  };
}

function getLoadingTaskLabel({
  loading,
  loadingMoreVisiblePoints,
  mode,
  query,
  selectedCountryCode
}: {
  loading: boolean;
  loadingMoreVisiblePoints: boolean;
  mode: TerraMode;
  query: string;
  selectedCountryCode: string | null;
}) {
  if (loading) {
    return mode.copy.loadingLabel;
  }

  if (loadingMoreVisiblePoints) {
    return mode.copy.loadingMoreLabel;
  }

  if (query.trim()) {
    return mode.copy.searchingLabel;
  }

  if (selectedCountryCode) {
    return mode.copy.countryLoadingLabel;
  }

  return mode.copy.loadingLabel;
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
