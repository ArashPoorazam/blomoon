"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TerraModeId, TerraPoint } from "@/lib/modes/types";
import type { FavouriteDto, FavouriteGroupDto, FavouriteRef } from "@/lib/persistence/types";
import type { ViewerDto } from "@/lib/users/dto";

type FavouritesState = {
  favouriteIds: Set<string>;
  groups: FavouriteGroupDto[];
  loading: boolean;
  refresh: () => Promise<void>;
  toggleFavourite: (point: TerraPoint) => Promise<void>;
};

export function useFavourites({
  getModeLabel,
  onAuthRequired,
  user
}: {
  getModeLabel: (modeId: TerraModeId) => string;
  onAuthRequired: () => void;
  user: ViewerDto | null;
}): FavouritesState {
  const [groups, setGroups] = useState<FavouriteGroupDto[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setGroups([]);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/users/me/favourites", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const payload = (await response.json()) as { groups: FavouriteGroupDto[] };
      setGroups(payload.groups);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const favouriteIds = useMemo(() => {
    const ids = new Set<string>();
    groups.forEach((group) => {
      group.favourites.forEach((favourite) => {
        ids.add(toFavouriteKey(favourite));
      });
    });
    return ids;
  }, [groups]);

  const toggleFavourite = useCallback(async (point: TerraPoint) => {
    if (!user) {
      onAuthRequired();
      return;
    }

    const ref = { modeId: point.modeId, pointId: point.id };
    const key = toFavouriteKey(ref);
    const isFavourite = favouriteIds.has(key);
    const previousGroups = groups;

    setGroups((currentGroups) => isFavourite
      ? removeFavouriteFromGroups(currentGroups, ref)
      : addFavouriteToGroups(currentGroups, {
        ...ref,
        createdAt: new Date().toISOString(),
        point
      }, getModeLabel(point.modeId))
    );

    try {
      const response = isFavourite
        ? await fetch(`/api/users/me/favourites/${encodeURIComponent(point.modeId)}/${encodeURIComponent(point.id)}`, {
          method: "DELETE"
        })
        : await fetch("/api/users/me/favourites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ref)
        });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      await refresh();
    } catch {
      setGroups(previousGroups);
    }
  }, [favouriteIds, getModeLabel, groups, onAuthRequired, refresh, user]);

  return {
    favouriteIds,
    groups,
    loading,
    refresh,
    toggleFavourite
  };
}

export function toFavouriteKey(ref: FavouriteRef) {
  return `${ref.modeId}:${ref.pointId}`;
}

function addFavouriteToGroups(groups: FavouriteGroupDto[], favourite: FavouriteDto, label: string) {
  const existingGroup = groups.find((group) => group.modeId === favourite.modeId);

  if (existingGroup) {
    return groups.map((group) => group.modeId === favourite.modeId
      ? {
        ...group,
        favourites: [favourite, ...group.favourites.filter((item) => toFavouriteKey(item) !== toFavouriteKey(favourite))]
      }
      : group
    );
  }

  return [
    {
      label,
      modeId: favourite.modeId,
      favourites: [favourite]
    },
    ...groups
  ];
}

function removeFavouriteFromGroups(groups: FavouriteGroupDto[], ref: FavouriteRef) {
  return groups
    .map((group) => ({
      ...group,
      favourites: group.favourites.filter((favourite) => toFavouriteKey(favourite) !== toFavouriteKey(ref))
    }))
    .filter((group) => group.favourites.length > 0);
}
