"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TerraPoint, TerraRandomPoint } from "./types";

type PrefetchedRandomPointState = {
  loading: boolean;
  point: TerraPoint | null;
  takePoint: () => Promise<TerraPoint | null>;
};

export function usePrefetchedRandomPoint({
  enabled,
  endpoint,
  excludePointId,
  prefetchEnabled = true
}: {
  enabled: boolean;
  endpoint?: string;
  excludePointId: string | null;
  prefetchEnabled?: boolean;
}): PrefetchedRandomPointState {
  const requestRef = useRef<Promise<TerraPoint | null> | null>(null);
  const versionRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [point, setPoint] = useState<TerraPoint | null>(null);

  const fetchRandomPoint = useCallback(async ({
    excludeOverride,
    store
  }: {
    excludeOverride?: string | null;
    store: boolean;
  }) => {
    if (!enabled || !endpoint) {
      return null;
    }

    const requestVersion = versionRef.current + 1;
    versionRef.current = requestVersion;
    setLoading(true);

    try {
      const url = new URL(endpoint, window.location.href);
      const excludedPointId = excludeOverride ?? excludePointId;

      if (excludedPointId) {
        url.searchParams.set("excludePointId", excludedPointId);
      }

      const response = await fetch(`${url.pathname}${url.search}`, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const randomPoint = (await response.json()) as TerraRandomPoint;

      if (store && versionRef.current === requestVersion) {
        setPoint(randomPoint.point);
      }

      return randomPoint.point;
    } catch {
      if (store && versionRef.current === requestVersion) {
        setPoint(null);
      }

      return null;
    } finally {
      if (versionRef.current === requestVersion) {
        setLoading(false);
      }
    }
  }, [enabled, endpoint, excludePointId]);

  const prefetch = useCallback((excludeOverride?: string | null) => {
    if (requestRef.current) {
      return;
    }

    if (!prefetchEnabled) {
      return;
    }

    requestRef.current = fetchRandomPoint({
      excludeOverride,
      store: true
    }).finally(() => {
      requestRef.current = null;
    });
  }, [fetchRandomPoint, prefetchEnabled]);

  useEffect(() => {
    if (!enabled || !endpoint) {
      versionRef.current += 1;
      requestRef.current = null;
      setLoading(false);
      setPoint(null);
      return;
    }

    if (point && point.id !== excludePointId) {
      return;
    }

    if (point && point.id === excludePointId) {
      setPoint(null);
    }

    prefetch(excludePointId);
  }, [enabled, endpoint, excludePointId, point, prefetch, prefetchEnabled]);

  const takePoint = useCallback(async () => {
    if (point && point.id !== excludePointId) {
      setPoint(null);
      prefetch(point.id);
      return point;
    }

    if (requestRef.current) {
      const prefetchedPoint = await requestRef.current;

      if (prefetchedPoint && prefetchedPoint.id !== excludePointId) {
        setPoint(null);
        prefetch(prefetchedPoint.id);
        return prefetchedPoint;
      }
    }

    const nextPoint = await fetchRandomPoint({
      excludeOverride: excludePointId,
      store: false
    });

    if (nextPoint) {
      prefetch(nextPoint.id);
    }

    return nextPoint;
  }, [excludePointId, fetchRandomPoint, point, prefetch]);

  return {
    loading,
    point,
    takePoint
  };
}
