"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TerraPoint } from "@/lib/modes/types";
import { toFavouriteKey } from "@/lib/persistence/favouriteKeys";
import type { FavouriteListDto } from "@/lib/persistence/types";
import type { ViewerDto } from "@/lib/users/dto";

type FavouritesState = {
  favouriteIds: Set<string>;
  lists: FavouriteListDto[];
  loading: boolean;
  addPointToList: (listId: string, point: TerraPoint) => Promise<void>;
  createList: (name: string) => Promise<FavouriteListDto | null>;
  deleteList: (listId: string) => Promise<void>;
  getPointListIds: (point: TerraPoint) => Set<string>;
  removePointFromList: (listId: string, point: TerraPoint) => Promise<void>;
  refresh: () => Promise<void>;
  renameList: (listId: string, name: string) => Promise<void>;
};

export function useFavourites({
  onAuthRequired,
  user
}: {
  onAuthRequired: () => void;
  user: ViewerDto | null;
}): FavouritesState {
  const [lists, setLists] = useState<FavouriteListDto[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setLists([]);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/users/me/favourite-lists", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const payload = (await response.json()) as { lists: FavouriteListDto[] };
      setLists(payload.lists);
    } catch {
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const favouriteIds = useMemo(() => {
    const ids = new Set<string>();
    lists.forEach((list) => {
      list.items.forEach((favourite) => {
        ids.add(toFavouriteKey(favourite));
      });
    });
    return ids;
  }, [lists]);

  const getPointListIds = useCallback((point: TerraPoint) => {
    const key = toFavouriteKey({ modeId: point.modeId, pointId: point.id });
    const listIds = new Set<string>();

    lists.forEach((list) => {
      if (list.items.some((item) => toFavouriteKey(item) === key)) {
        listIds.add(list.id);
      }
    });

    return listIds;
  }, [lists]);

  const createList = useCallback(async (name: string) => {
    if (!user) {
      onAuthRequired();
      return null;
    }

    try {
      const response = await fetch("/api/users/me/favourite-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const payload = (await response.json()) as { list: FavouriteListDto };
      await refresh();
      return payload.list;
    } catch {
      return null;
    }
  }, [onAuthRequired, refresh, user]);

  const renameList = useCallback(async (listId: string, name: string) => {
    if (!user) {
      onAuthRequired();
      return;
    }

    const response = await fetch(`/api/users/me/favourite-lists/${encodeURIComponent(listId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });

    if (response.ok) {
      await refresh();
    }
  }, [onAuthRequired, refresh, user]);

  const deleteList = useCallback(async (listId: string) => {
    if (!user) {
      onAuthRequired();
      return;
    }

    const response = await fetch(`/api/users/me/favourite-lists/${encodeURIComponent(listId)}`, {
      method: "DELETE"
    });

    if (response.ok) {
      await refresh();
    }
  }, [onAuthRequired, refresh, user]);

  const addPointToList = useCallback(async (listId: string, point: TerraPoint) => {
    if (!user) {
      onAuthRequired();
      return;
    }

    const response = await fetch(`/api/users/me/favourite-lists/${encodeURIComponent(listId)}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modeId: point.modeId, pointId: point.id })
    });

    if (response.ok) {
      await refresh();
    }
  }, [onAuthRequired, refresh, user]);

  const removePointFromList = useCallback(async (listId: string, point: TerraPoint) => {
    if (!user) {
      onAuthRequired();
      return;
    }

    const response = await fetch(`/api/users/me/favourite-lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(point.modeId)}/${encodeURIComponent(point.id)}`, {
      method: "DELETE"
    });

    if (response.ok) {
      await refresh();
    }
  }, [onAuthRequired, refresh, user]);

  return {
    addPointToList,
    createList,
    deleteList,
    favouriteIds,
    getPointListIds,
    lists,
    loading,
    refresh,
    removePointFromList,
    renameList
  };
}
