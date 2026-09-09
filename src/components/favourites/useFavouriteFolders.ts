"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TerraPoint } from "@/lib/modes/types";
import { getPointKey, getPointRefKey } from "@/lib/modes/pointKeys";
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
  const [pointsStatus, setPointsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [foldersError, setFoldersError] = useState(false);
  const pointsLoaded = pointsStatus === "ready";
  const userId = user?.id;
  const pointsRequest = useRef<Promise<void> | null>(null);
  const generation = useRef(0);
  const folderRequest = useRef(0);

  const refreshFolders = useCallback(async (foreground = true) => {
    if (!userId) { setFolders([]); return; }
    const requestGeneration = generation.current;
    setFoldersError(false);
    if (foreground) setLoading(true);
    try {
      const response = await fetch("/api/users/me/favourite-folders", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const { folders: next } = await response.json() as { folders: FavouriteFolderSummaryDto[] };
      if (generation.current !== requestGeneration) return;
      setFolders(next);
      setActiveFolder((current) => {
        const summary = next.find((folder) => folder.id === current?.id);
        return current && summary ? { ...current, ...summary } : current;
      });
    } catch { if (generation.current === requestGeneration) setFoldersError(true); }
    finally { if (foreground && generation.current === requestGeneration) setLoading(false); }
  }, [userId]);

  const loadPoints = useCallback((force = false): Promise<void> => {
    if (!userId || (pointsLoaded && !force)) return Promise.resolve();
    if (pointsRequest.current) return pointsRequest.current;
    const requestGeneration = generation.current;
    setPointsStatus("loading");
    const request = (async () => {
      try {
        const response = await fetch("/api/users/me/favourite-points", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load memberships");
        const payload = await response.json() as { memberships: FavouriteFolderMembershipDto[]; points: TerraPoint[] };
        if (generation.current !== requestGeneration) return;
        setPoints(payload.points);
        setMemberships(payload.memberships);
        setPointsStatus("ready");
      } catch {
        if (generation.current === requestGeneration) setPointsStatus("error");
      } finally {
        if (generation.current === requestGeneration) pointsRequest.current = null;
      }
    })();
    pointsRequest.current = request;
    return request;
  }, [pointsLoaded, userId]);

  const loadFolder = useCallback(async (folderId: string) => {
    if (!user) { onAuthRequired(); return null; }
    const requestId = ++folderRequest.current;
    setFolderLoading(true);
    try {
      const response = await fetch(`/api/users/me/favourite-folders/${encodeURIComponent(folderId)}`, { cache: "no-store" });
      if (!response.ok) return null;
      const folder = ((await response.json()) as { folder: FavouriteFolderDto }).folder;
      if (requestId !== folderRequest.current) return null;
      setActiveFolder(folder); return folder;
    } catch { return null; }
    finally { if (requestId === folderRequest.current) setFolderLoading(false); }
  }, [onAuthRequired, user]);

  useEffect(() => {
    generation.current += 1;
    folderRequest.current += 1;
    pointsRequest.current = null;
    setPoints([]); setMemberships([]); setPointsStatus("idle"); setActiveFolder(null);
    setFolderLoading(false);
    void refreshFolders();
    return () => { generation.current += 1; folderRequest.current += 1; };
  }, [refreshFolders]);

  const refreshAfterMutation = useCallback(async (folderId?: string) => {
    await Promise.all([refreshFolders(false), pointsLoaded ? loadPoints(true) : Promise.resolve(), folderId ? loadFolder(folderId) : Promise.resolve()]);
  }, [loadFolder, loadPoints, pointsLoaded, refreshFolders]);

  const createFolder = useCallback(async (name: string, description: string | null, modeId: string) => {
    if (!user) { onAuthRequired(); return null; }
    const response = await fetch("/api/users/me/favourite-folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, modeId }) });
    if (response.status === 409) return null;
    if (!response.ok) throw new Error("Could not create the folder.");
    const folder = ((await response.json()) as { folder: FavouriteFolderSummaryDto }).folder;
    void refreshFolders(false).catch(() => undefined);
    setFolders((current) => [...current, folder]);
    return folder;
  }, [onAuthRequired, refreshFolders, user]);

  const updateFolder = useCallback(async (folderId: string, name: string, description: string | null) => {
    const response = await fetch(`/api/users/me/favourite-folders/${encodeURIComponent(folderId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
    if (response.status === 409) return false;
    if (!response.ok) throw new Error("Could not save the folder.");
    const { folder } = await response.json() as { folder: FavouriteFolderSummaryDto };
    setActiveFolder((current) => current?.id === folder.id ? { ...current, ...folder } : current);
    setFolders((current) => current.map((item) => item.id === folder.id ? folder : item));
    return true;
  }, []);

  const deleteFolder = useCallback(async (folderId: string) => {
    const response = await fetch(`/api/users/me/favourite-folders/${encodeURIComponent(folderId)}`, { method: "DELETE" });
    if (response.ok) { setActiveFolder(null); await refreshAfterMutation(); }
    return response.ok;
  }, [refreshAfterMutation]);

  const addPointToFolder = useCallback(async (folderId: string, point: TerraPoint) => {
    const response = await fetch(`/api/users/me/favourite-folders/${encodeURIComponent(folderId)}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modeId: point.modeId, pointId: point.id }) });
    if (!response.ok) throw new Error("Could not update this folder. Please try again.");
    await refreshAfterMutation(activeFolder?.id === folderId ? folderId : undefined);
  }, [activeFolder?.id, refreshAfterMutation]);

  const removePointFromFolder = useCallback(async (folderId: string, point: TerraPoint) => {
    const response = await fetch(`/api/users/me/favourite-folders/${encodeURIComponent(folderId)}/items/${encodeURIComponent(point.modeId)}/${encodeURIComponent(point.id)}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Could not update this folder. Please try again.");
    await refreshAfterMutation(activeFolder?.id === folderId ? folderId : undefined);
  }, [activeFolder?.id, refreshAfterMutation]);

  const shareFolder = useCallback(async (folderId: string, rotate = false) => {
    const response = await fetch(`/api/users/me/favourite-folders/${encodeURIComponent(folderId)}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rotate }) });
    if (!response.ok) return null;
    const { token } = await response.json() as { token: string };
    // Sharing has committed. A failed metadata refresh must not discard the new link.
    void refreshFolders(false).catch(() => undefined);
    return token;
  }, [refreshFolders]);

  const getPointFolderIds = useCallback((point: TerraPoint) => {
    const key = getPointKey(point);
    return new Set(memberships.filter((item) => getPointRefKey(item) === key).map((item) => item.folderId));
  }, [memberships]);

  return {
    activeFolder, addPointToFolder, createFolder, deleteFolder, folderLoading, folders,
    getPointFolderIds, loadFolder, loadPoints, loading, memberships, points, pointsStatus, foldersError, refreshFolders,
    favouriteIds: useMemo(() => new Set(points.map(getPointKey)), [points]),
    refreshAfterMutation, removePointFromFolder, shareFolder, updateFolder
  };
}
