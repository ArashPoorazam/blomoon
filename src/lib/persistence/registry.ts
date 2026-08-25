import "server-only";

import { radioPersistenceAdapter } from "@/lib/persistence/radio";
import type { TerraModeId } from "@/lib/modes/types";
import type { FavouriteGroupDto, ModePersistenceAdapter } from "./types";

const modePersistenceAdapters = [
  radioPersistenceAdapter
] satisfies ModePersistenceAdapter[];

export function getModePersistenceAdapter(modeId: TerraModeId | string) {
  return modePersistenceAdapters.find((adapter) => adapter.modeId === modeId) ?? null;
}

export async function listFavouriteGroups(userId: string): Promise<FavouriteGroupDto[]> {
  const groups = await Promise.all(modePersistenceAdapters.map(async (adapter) => ({
    label: adapter.label,
    modeId: adapter.modeId,
    favourites: await adapter.listFavourites(userId)
  })));

  return groups.filter((group) => group.favourites.length > 0);
}
