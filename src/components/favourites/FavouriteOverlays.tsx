"use client";

import type { TerraPoint, TerraPointDetail } from "@/lib/modes/types";
import type { useFavouriteFolders } from "./useFavouriteFolders";
import { absoluteShareLink, stationSharePath } from "@/lib/sharing/links";
import { FavouriteFolderPicker } from "./FavouriteFolderPicker";
import { ShareDialog } from "../sharing/ShareDialog";
import { SharedFolderPreview } from "../sharing/SharedFolderPreview";
import { useShareEntry } from "../sharing/useShareEntry";

export function FavouriteOverlays({ favourites, pickerPoint, sharePoint, onCleanUrl, onClosePicker, onCloseShare, onOpenFolder, onStationEntry }: {
  favourites: ReturnType<typeof useFavouriteFolders>; pickerPoint: TerraPoint | null; sharePoint: TerraPoint | null;
  onCleanUrl: () => void; onClosePicker: () => void; onCloseShare: () => void; onOpenFolder: (folderId: string) => void;
  onStationEntry: (point: TerraPointDetail) => void;
}) {
  const shareEntry = useShareEntry({ onStation: onStationEntry });
  return <>
    {pickerPoint ? <FavouriteFolderPicker folders={favourites.folders} point={pickerPoint} selectedFolderIds={favourites.getPointFolderIds(pickerPoint)} onAddToFolder={favourites.addPointToFolder} onClose={onClosePicker} onCreateFolder={favourites.createFolder} onRemoveFromFolder={favourites.removePointFromFolder} /> : null}
    {sharePoint ? <ShareDialog title={sharePoint.name} link={absoluteShareLink(stationSharePath(sharePoint.modeId, sharePoint.id), window.location.origin)} onClose={onCloseShare} /> : null}
    {shareEntry.folderEntry ? <SharedFolderPreview entry={shareEntry.folderEntry} onClose={() => { shareEntry.clearFolderEntry(); onCleanUrl(); }} onImport={async (token) => {
      const response = await fetch(`/api/shared/favourite-folders/${encodeURIComponent(token)}/import`, { method: "POST" }); if (!response.ok) return;
      const { folderId } = await response.json() as { folderId: string }; await favourites.refreshAfterMutation(); onOpenFolder(folderId); shareEntry.clearFolderEntry(); onCleanUrl();
    }} /> : null}
  </>;
}
