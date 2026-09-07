"use client";

import { useMemo } from "react";
import { getPlaybackQueuePoints, type PlaybackQueueSource } from "@/lib/modes/playbackNavigation";
import type { TerraModeId, TerraPoint } from "@/lib/modes/types";
import type { ShellDrawerStack } from "./shell/drawerState";

export function getDrawerPointSource(stack: ShellDrawerStack): PlaybackQueueSource | null {
  if (stack.some((entry) => entry.kind === "history")) return "history";
  if (stack.some((entry) => entry.kind === "favourites" || entry.kind === "favourite-folder")) return "favourites";
  return null;
}

export function usePointSources({ activeModeId, drawerSource, favouritePoints, historyPoints, listPoints, queueSource }: {
  activeModeId: TerraModeId;
  drawerSource: PlaybackQueueSource | null;
  favouritePoints: TerraPoint[];
  historyPoints: TerraPoint[];
  listPoints: TerraPoint[];
  queueSource: PlaybackQueueSource;
}) {
  return useMemo(() => {
    const sources: Record<PlaybackQueueSource, TerraPoint[]> = {
      favourites: favouritePoints.filter((point) => point.modeId === activeModeId),
      history: historyPoints.filter((point) => point.modeId === activeModeId),
      list: listPoints
    };
    return {
      drawerListsPoints: drawerSource !== null,
      listedPoints: drawerSource ? sources[drawerSource] : listPoints,
      playbackQueuePoints: getPlaybackQueuePoints(queueSource, sources)
    };
  }, [activeModeId, drawerSource, favouritePoints, historyPoints, listPoints, queueSource]);
}
