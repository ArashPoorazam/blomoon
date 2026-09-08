"use client";

import { useMemo } from "react";
import type { TerraPoint } from "@/lib/modes/types";
import type { FavouriteFolderDto } from "@/lib/persistence/types";
import type { ShellDrawerEntry } from "../shell/drawerState";

export function useFavouriteDrawerPoints({ activeFolder, entry, points }: {
  activeFolder: FavouriteFolderDto | null;
  entry: ShellDrawerEntry;
  points: TerraPoint[];
}) {
  return useMemo(
    () => entry.kind === "favourite-folder" && activeFolder?.id === entry.folderId
      ? activeFolder.items.map((item) => item.point)
      : entry.kind === "favourite-folder" ? [] : points,
    [activeFolder, entry, points]
  );
}
