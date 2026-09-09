"use client";

import { ChevronLeft, LockKeyhole, Pencil, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import type { TerraPoint } from "@/lib/modes/types";
import { getPointRefKey } from "@/lib/modes/pointKeys";
import { findTerraMode } from "@/lib/modes/registry";
import { formatDateTime } from "@/lib/geo";
import type { FavouriteFolderDto } from "@/lib/persistence/types";
import { absoluteShareLink, folderSharePath } from "@/lib/sharing/links";
import { DrawerHeader } from "../drawer/DrawerHeader";
import { PointActionMenu } from "../drawer/PointActionMenu";
import { PointRow } from "../drawer/PointRow";
import { ShareDialog } from "../sharing/ShareDialog";
import { ModalShell } from "../ui/ModalShell";
import { FavouriteFolderForm } from "./FavouriteFolderForm";
import { formatFolderDate } from "./FolderSummary";

export function FavouriteFolderDetail({ activePlaybackPointKey, folder, loading, onBack, onDelete, onInspect, onPlay, onRemove, onShare, onSharePoint, onUpdate }: {
  activePlaybackPointKey: string | null; folder: FavouriteFolderDto | null; loading: boolean; onBack: () => void;
  onDelete: (folderId: string) => Promise<boolean>; onInspect: (point: TerraPoint) => void; onPlay: (point: TerraPoint) => void;
  onRemove: (folderId: string, point: TerraPoint) => Promise<void>;
  onShare: (folderId: string, rotate?: boolean) => Promise<string | null>; onSharePoint: (point: TerraPoint) => void;
  onUpdate: (folderId: string, name: string, description: string | null) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function share(rotate = false) {
    if (!folder) return;
    const token = await onShare(folder.id, rotate);
    if (!token) throw new Error("Could not create a folder link. Please try again.");
    setShareLink(absoluteShareLink(folderSharePath(token), window.location.origin));
  }

  return <div className="favourites-view" aria-label={folder?.name ?? "Favourite folder"}>
    <DrawerHeader className="favourites-header" title={folder?.name ?? "Folder"} subtitle={loading ? "Loading folder" : "Your collection"} actions={<button className="icon-button" type="button" aria-label="Back to folders" onClick={onBack}><ChevronLeft size={17} aria-hidden="true" /></button>} />
    <div className="favourites-body">
      {loading ? <div className="empty-state">Loading folder</div> : null}
      {folder ? <>
        <div className="folder-introduction">
          <p className="folder-description">{folder.description || "No description"}</p>
          <div className="folder-detail-summary"><strong>{folder.itemCount} {folder.itemCount === 1 ? "station" : "stations"}</strong><span>Updated {formatFolderDate(folder.updatedAt)}</span></div>
          <dl className="folder-facts"><div><dt>Created</dt><dd>{formatFolderDate(folder.createdAt)}</dd></div><div><dt>Sharing</dt><dd>{folder.isShared ? "Link active" : "Private"}</dd></div>{folder.isImported && folder.importedAt ? <div><dt>Imported</dt><dd>{formatFolderDate(folder.importedAt)}</dd></div> : null}</dl>
          <div className="folder-detail-actions">
            <button className="secondary-action compact-action" disabled={sharing} type="button" onClick={() => { setSharing(true); setError(null); void share().catch(() => setError("Could not create a folder link. Please try again.")).finally(() => setSharing(false)); }}><Share2 size={15} aria-hidden="true" /> {sharing ? "Opening…" : "Share"}</button>
            <button className="secondary-action compact-action" type="button" onClick={() => setEditing(true)}><Pencil size={15} aria-hidden="true" /> Edit</button>
            {folder.isDefault ? <span className="protected-folder"><LockKeyhole size={13} aria-hidden="true" /> Protected</span> : <button className="icon-button danger-action folder-delete" type="button" aria-label="Delete folder" title="Delete folder" onClick={() => setDeleting(true)}><Trash2 size={15} aria-hidden="true" /></button>}
          </div>
          {error ? <p className="form-error" role="status">{error}</p> : null}
        </div>
        {editing ? <FavouriteFolderForm title="Edit folder" submitLabel="Save changes" initialName={folder.name} initialDescription={folder.description ?? ""} nameLocked={folder.isDefault} onCancel={() => setEditing(false)} onSubmit={async (name, description) => { const ok = await onUpdate(folder.id, name, description); if (ok) setEditing(false); return ok; }} /> : null}
        {folder.items.length === 0 ? <div className="favourites-empty"><strong>This folder is empty</strong><span>Use a station’s star button to add it here.</span></div> : <div className="folder-station-list">{folder.items.map((item) => <PointRow
          key={getPointRefKey(item)} point={item.point}
          playing={activePlaybackPointKey === getPointRefKey(item)}
          metadata={[item.point.summary, findTerraMode(item.modeId)?.formatPointMetric(item.point), formatDateTime(item.point.timestamp)].filter(Boolean).join(" · ")}
          onPlay={onPlay}
          actions={<PointActionMenu point={item.point} onInfo={onInspect} onShare={onSharePoint} onDelete={(point) => void onRemove(folder.id, point)} />}
        />)}</div>}
      </> : null}
    </div>
    {deleting && folder ? <ModalShell kicker="Confirm" title={`Delete ${folder.name}?`} onClose={() => setDeleting(false)}><p>Stations saved only here will leave your favourites.</p><div className="confirm-actions"><button className="primary-action danger-action" type="button" onClick={() => void onDelete(folder.id).then((ok) => { if (ok) onBack(); })}>Delete folder</button><button className="secondary-action" type="button" onClick={() => setDeleting(false)}>Not now</button></div></ModalShell> : null}
    {shareLink && folder ? <ShareDialog link={shareLink} title={folder.name} onClose={() => setShareLink(null)} onChangeLink={() => share(true)} /> : null}
  </div>;
}
