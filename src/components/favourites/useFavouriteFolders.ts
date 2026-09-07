"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TerraPoint } from "@/lib/modes/types";
import { toFavouriteKey } from "@/lib/persistence/favouriteKeys";
import type {
  FavouriteFolderDto,
  FavouriteFolderMembershipDto,
  FavouriteFolderSummaryDto
} from "@/lib/persistence/types";
import type { ViewerDto } from "@/lib/users/dto";

export function useFavouriteFolders({ onAuthRequired, user }: { onAuthRequired: () => void; user: ViewerDto | null }) {
  const [folders, setFolders] = useState<FavouriteFolderSummaryDto[]>([]);
  const [activeFolder, setActiveFolder] = useState<FavouriteFolderDto | null>(null);
  const [points, setPoints] = useState<TerraPoint[]>([]);
  const [memberships, setMemberships] = useState<FavouriteFolderMembershipDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [pointsLoaded, setPointsLoaded] = useState(false);

  const refreshFolders = useCallback(async () => {
    if (!user) { setFolders([]); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/users/me/favourite-folders", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setFolders(((await response.json()) as { folders: FavouriteFolderSummaryDto[] }).folders);
    } catch { setFolders([]); } finally { setLoading(false); }
  }, [user]);

  const loadPoints = useCallback(async (force = false) => {
    if (!user || (pointsLoaded && !force)) return;
    const response = await fetch("/api/users/me/favourite-points", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json() as { memberships: FavouriteFolderMembershipDto[]; points: TerraPoint[] };
    setPoints(payload.points); setMemberships(payload.memberships); setPointsLoaded(true);
  }, [pointsLoaded, user]);

  const loadFolder = useCallback(async (folderId: string) => {
    if (!user) { onAuthRequired(); return null; }
    setFolderLoading(true);
    try {
      const response = await fetch(`/api/users/me/favourite-folders/${encodeURIComponent(folderId)}`, { cache: "no-store" });
      if (!response.ok) return null;
      const folder = ((await response.json()) as { folder: FavouriteFolderDto }).folder;
      setActiveFolder(folder); return folder;
    } finally { setFolderLoading(false); }
  }, [onAuthRequired, user]);

  useEffect(() => { setPoints([]); setMemberships([]); setPointsLoaded(false); setActiveFolder(null); void refreshFolders(); }, [refreshFolders, user?.id]);

  const refreshAfterMutation = useCallback(async (folderId?: string) => {
    await Promise.all([refreshFolders(), pointsLoaded ? loadPoints(true) : Promise.resolve(), folderId ? loadFolder(folderId) : Promise.resolve()]);
  }, [loadFolder, loadPoints, pointsLoaded, refreshFolders]);

  const createFolder = useCallback(async (name: string, description: string | null) => {
    if (!user) { onAuthRequired(); return null; }
    const response = await fetch("/api/users/me/favourite-folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
    if (!response.ok) return null;
    const folder = ((await response.json()) as { folder: FavouriteFolderSummaryDto }).folder;
    await refreshFolders(); return folder;
  }, [onAuthRequired, refreshFolders, user]);

  const updateFolder = useCallback(async (folderId: string, name: string, description: string | null) => {
    const response = await fetch(`/api/users/me/favourite-folders/${encodeURIComponent(folderId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
    if (response.ok) await refreshAfterMutation(folderId);
    return response.ok;
  }, [refreshAfterMutation]);

  const deleteFolder = useCallback(async (folderId: string) => {
    const response = await fetch(`/api/users/me/favourite-folders/${encodeURIComponent(folderId)}`, { method: "DELETE" });
    if (response.ok) { setActiveFolder(null); await refreshAfterMutation(); }
    return response.ok;
  }, [refreshAfterMutation]);

  const addPointToFolder = useCallback(async (folderId: string, point: TerraPoint) => {
    const response = await fetch(`/api/users/me/favourite-folders/${encodeURIComponent(folderId)}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modeId: point.modeId, pointId: point.id }) });
    if (response.ok) await refreshAfterMutation(activeFolder?.id === folderId ? folderId : undefined);
  }, [activeFolder?.id, refreshAfterMutation]);

  const removePointFromFolder = useCallback(async (folderId: string, point: TerraPoint) => {
    const response = await fetch(`/api/users/me/favourite-folders/${encodeURIComponent(folderId)}/items/${encodeURIComponent(point.modeId)}/${encodeURIComponent(point.id)}`, { method: "DELETE" });
    if (response.ok) await refreshAfterMutation(activeFolder?.id === folderId ? folderId : undefined);
  }, [activeFolder?.id, refreshAfterMutation]);

  const shareFolder = useCallback(async (folderId: string) => {
    const response = await fetch(`/api/users/me/favourite-folders/${encodeURIComponent(folderId)}/share`, { method: "POST" });
    if (!response.ok) return null;
    const { token } = await response.json() as { token: string }; await refreshAfterMutation(folderId); return token;
  }, [refreshAfterMutation]);

  const revokeShare = useCallback(async (folderId: string) => {
    const response = await fetch(`/api/users/me/favourite-folders/${encodeURIComponent(folderId)}/share`, { method: "DELETE" });
    if (response.ok) await refreshAfterMutation(folderId); return response.ok;
  }, [refreshAfterMutation]);

  const getPointFolderIds = useCallback((point: TerraPoint) => {
    const key = toFavouriteKey({ modeId: point.modeId, pointId: point.id });
    return new Set(memberships.filter((item) => toFavouriteKey(item) === key).map((item) => item.folderId));
  }, [memberships]);

  return {
    activeFolder, addPointToFolder, createFolder, deleteFolder, folderLoading, folders,
    getPointFolderIds, loadFolder, loadPoints, loading, memberships, points,
    favouriteIds: useMemo(() => new Set(points.map(getPointKey)), [points]),
    refreshAfterMutation, removePointFromFolder, revokeShare, shareFolder, updateFolder
  };
}

function getPointKey(point: TerraPoint) { return toFavouriteKey({ modeId: point.modeId, pointId: point.id }); }
