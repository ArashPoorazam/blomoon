"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TerraModeId, TerraPoint } from "@/lib/modes/types";
import { mergePlaybackHistoryItem } from "@/lib/playback-history/history";
import type { PlaybackHistoryItemDto } from "@/lib/persistence/types";

export type PlaybackHistoryModeState = {
  error: string | null;
  items: PlaybackHistoryItemDto[];
  status: "idle" | "loading" | "ready" | "error";
};

const EMPTY_STATE: PlaybackHistoryModeState = { error: null, items: [], status: "idle" };

export function usePlaybackHistory(userId: string | null) {
  const [states, setStates] = useState<Record<string, PlaybackHistoryModeState>>({});
  const requestIds = useRef(new Map<string, number>());
  const userIdRef = useRef(userId);
  const enabled = Boolean(userId);

  useEffect(() => {
    userIdRef.current = userId;
    requestIds.current.clear();
    setStates({});
  }, [userId]);

  const load = useCallback(async (modeId: TerraModeId, refresh = false) => {
    // Entering a drawer reuses this session's result; Retry explicitly refreshes it.
    if (!enabled || (!refresh && requestIds.current.has(modeId))) return;
    const requestUserId = userIdRef.current;
    const requestId = (requestIds.current.get(modeId) ?? 0) + 1;
    requestIds.current.set(modeId, requestId);
    setStates((current) => ({
      ...current,
      [modeId]: { ...(current[modeId] ?? EMPTY_STATE), error: null, status: "loading" }
    }));

    try {
      const response = await fetch(`/api/users/me/playback-history?modeId=${encodeURIComponent(modeId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Recent playback history could not be refreshed.");
      const payload = await response.json() as { items: PlaybackHistoryItemDto[] };
      if (userIdRef.current !== requestUserId || requestIds.current.get(modeId) !== requestId) return;
      setStates((current) => ({ ...current, [modeId]: { error: null, items: payload.items, status: "ready" } }));
    } catch (error) {
      if (userIdRef.current !== requestUserId || requestIds.current.get(modeId) !== requestId) return;
      setStates((current) => ({
        ...current,
        [modeId]: {
          error: error instanceof Error ? error.message : "Recent playback history could not be refreshed.",
          items: current[modeId]?.items ?? [],
          status: "error"
        }
      }));
    }
  }, [enabled]);

  const record = useCallback(async (point: TerraPoint) => {
    if (!enabled) return;
    const recordingUserId = userId;
    try {
      const response = await fetch("/api/users/me/playback-history", {
        body: JSON.stringify({
          modeId: point.modeId,
          pointId: point.id,
          timezoneOffsetMinutes: new Date().getTimezoneOffset()
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      if (!response.ok) return;
      const { item } = await response.json() as { item: PlaybackHistoryItemDto };
      if (userIdRef.current !== recordingUserId) return;
      setStates((current) => ({
        ...current,
        [point.modeId]: {
          error: current[point.modeId]?.error ?? null,
          items: mergePlaybackHistoryItem(current[point.modeId]?.items ?? [], item),
          status: current[point.modeId]?.status === "error" ? "error" : "ready"
        }
      }));
    } catch {
      // Playback history is best-effort and must never affect the media session.
    }
  }, [enabled, userId]);

  const getState = useCallback((modeId: TerraModeId) => states[modeId] ?? EMPTY_STATE, [states]);
  return useMemo(() => ({ getState, load, record }), [getState, load, record]);
}
