"use client";

import { useMemo } from "react";
import { uniquePoints } from "@/lib/modes/pointCollections";
import type { TerraModeId, TerraPoint } from "@/lib/modes/types";
import type { FavouriteFolderDto } from "@/lib/persistence/types";
import type { ShellDrawerEntry } from "../shell/drawerState";
import type { PlaybackQueueSource } from "../usePointInteractions";

export function useFavouriteGlobeContext({ activeFolder, activeModeId, entry, points, queueSource, visiblePoints }: {
  activeFolder: FavouriteFolderDto | null; activeModeId: TerraModeId; entry: ShellDrawerEntry; points: TerraPoint[];
  queueSource: PlaybackQueueSource; visiblePoints: TerraPoint[];
}) {
  const favouritePoints = useMemo(() => entry.kind === "favourite-folder" && activeFolder?.id === entry.folderId ? activeFolder.items.map((item) => item.point) : points, [activeFolder, entry, points]);
  const activeModeFavouritePoints = useMemo(() => uniquePoints(favouritePoints.filter((point) => point.modeId === activeModeId)), [activeModeId, favouritePoints]);
  return { favouritePoints, playbackQueuePoints: queueSource === "favourites" ? activeModeFavouritePoints : visiblePoints };
}
