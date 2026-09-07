"use client";

import { useEffect, useRef, useState } from "react";
import type { TerraPointDetail } from "@/lib/modes/types";
import { terraModes } from "@/lib/modes/registry";
import type { SharedFolderPreviewDto } from "@/lib/persistence/types";

export type FolderShareEntry = { isOwner: boolean; preview: SharedFolderPreviewDto | null; status: "loading" | "ready" | "unavailable"; token: string };

export function useShareEntry({ onStation }: { onStation: (point: TerraPointDetail) => void }) {
  const [folderEntry, setFolderEntry] = useState<FolderShareEntry | null>(null);
  const handledPath = useRef<string | null>(null);
  useEffect(() => {
    const path = window.location.pathname; if (handledPath.current === path) return; handledPath.current = path;
    const stationMatch = path.match(/^\/share\/stations\/([^/]+)\/([^/]+)$/);
    if (stationMatch) {
      const modeId = decodeURIComponent(stationMatch[1]); const pointId = decodeURIComponent(stationMatch[2]); const mode = terraModes.find((candidate) => candidate.id === modeId);
      if (!mode) return;
      void fetch(mode.detailEndpoint(pointId), { cache: "no-store" }).then(async (response) => { if (response.ok) onStation(await response.json() as TerraPointDetail); });
      return;
    }
    const folderMatch = path.match(/^\/share\/folders\/([^/]+)$/); if (!folderMatch) return;
    const token = decodeURIComponent(folderMatch[1]); setFolderEntry({ isOwner: false, preview: null, status: "loading", token });
    void fetch(`/api/shared/favourite-folders/${encodeURIComponent(token)}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) { setFolderEntry({ isOwner: false, preview: null, status: "unavailable", token }); return; }
      const payload = await response.json() as { isOwner: boolean; preview: SharedFolderPreviewDto };
      setFolderEntry({ isOwner: payload.isOwner, preview: payload.preview, status: "ready", token });
    }).catch(() => setFolderEntry({ isOwner: false, preview: null, status: "unavailable", token }));
  }, [onStation]);
  return { folderEntry, clearFolderEntry: () => setFolderEntry(null) };
}
