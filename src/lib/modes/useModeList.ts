"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createInitialModeListSnapshot, createModeListSnapshot } from "./modeListState";
import type { TerraMode, TerraPointPage } from "./types";

const PAGE_SIZE = 50;
const empty = () => createInitialModeListSnapshot(null, PAGE_SIZE);

export function listContext(query: string, countryCode: string | null) {
  return query.trim() ? "search" : countryCode ? "country" : "home";
}

export function useModeList(mode: TerraMode, countryCode: string | null, viewerKey: string) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sorts, setSorts] = useState({ modeId: mode.id, home: mode.recommendations?.sortId ?? mode.defaultSortId,
    country: mode.defaultSortId, search: mode.searchSortId ?? mode.defaultSortId });
  const context = listContext(query, countryCode);
  const defaults = { home: mode.recommendations?.sortId ?? mode.defaultSortId, country: mode.defaultSortId,
    search: mode.searchSortId ?? mode.defaultSortId };
  const sortId = sorts.modeId === mode.id ? sorts[context] : defaults[context];
  const suggested = context === "home" && sortId === mode.recommendations?.sortId;
  const requestKey = JSON.stringify([mode.id, countryCode, debouncedQuery.trim(), sortId, viewerKey]);
  const currentKey = useRef(requestKey);
  currentKey.current = requestKey;
  const [state, setState] = useState({ key: "", page: empty(), loading: true, loadingMore: false, error: null as string | null });
  const current = state.key === requestKey;
  const page = current ? state.page : empty();

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const endpoint = useCallback((offset: number, pageToken?: string) => suggested && mode.recommendations
    ? mode.recommendations.endpoint({ limit: PAGE_SIZE, offset, pageToken })
    : mode.listEndpoint({ countryCode, limit: PAGE_SIZE, offset, pageToken, query: debouncedQuery, sortId }),
  [countryCode, debouncedQuery, mode, sortId, suggested]);

  useEffect(() => {
    const controller = new AbortController();
    setState({ key: requestKey, page: empty(), loading: true, loadingMore: false, error: null });
    if (viewerKey === "loading") return () => controller.abort();
    void fetchPage(endpoint(0), controller.signal).then((result) => {
      if (!controller.signal.aborted && currentKey.current === requestKey) {
        setState({ key: requestKey, page: createModeListSnapshot(result), loading: false, loadingMore: false, error: null });
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted && currentKey.current === requestKey) {
        setState({ key: requestKey, page: empty(), loading: false, loadingMore: false,
          error: error instanceof Error ? error.message : "Stations are unavailable." });
      }
    });
    return () => controller.abort();
  }, [endpoint, requestKey, viewerKey]);

  const loadMore = useCallback(async () => {
    if (!current || state.loading || state.loadingMore || page.nextOffset === null) return;
    setState((value) => ({ ...value, loadingMore: true, error: null }));
    try {
      const { page: result, replaced } = await fetchNextModePage(endpoint(page.nextOffset, page.pageToken), endpoint(0));
      if (currentKey.current !== requestKey) return;
      setState((value) => ({ ...value, loadingMore: false, page: { ...createModeListSnapshot(result),
        points: [...new Map([...(replaced ? [] : value.page.points), ...result.points].map((point) => [point.id, point])).values()] } }));
    } catch (error) {
      if (currentKey.current !== requestKey) return;
      setState((value) => ({ ...value, loadingMore: false,
        error: error instanceof Error ? error.message : "More stations are unavailable." }));
    }
  }, [current, endpoint, page.nextOffset, page.pageToken, requestKey, state.loading, state.loadingMore]);

  return { page, query, setQuery, debouncedQuery, sortId, suggested,
    loading: !current || state.loading, loadingMore: current && state.loadingMore,
    settled: current && !state.loading, error: current ? state.error : null, loadMore,
    setSortId: (value: string) => setSorts((previous) => ({ ...(previous.modeId === mode.id ? previous : { ...defaults, modeId: mode.id }), [context]: value })),
  };
}

async function fetchPage(endpoint: string, signal?: AbortSignal): Promise<TerraPointPage> {
  const response = await fetch(endpoint, { cache: "no-store", signal });
  if (response.status === 409) throw new RecommendationExpiredError();
  if (!response.ok) throw new Error("Stations are unavailable. Please retry.");
  return await response.json() as TerraPointPage;
}

class RecommendationExpiredError extends Error {}

/** An expired snapshot must be replaced, never appended to the previous ranking. */
export async function fetchNextModePage(nextEndpoint: string, firstEndpoint: string) {
  try {
    return { page: await fetchPage(nextEndpoint), replaced: false };
  } catch (error) {
    if (!(error instanceof RecommendationExpiredError)) throw error;
    try {
      return { page: await fetchPage(firstEndpoint), replaced: true };
    } catch {
      throw new Error("Could not renew suggestions. Please try loading again.");
    }
  }
}
