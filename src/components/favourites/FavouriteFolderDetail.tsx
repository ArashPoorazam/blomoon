"use client";

import { ChevronLeft, Import, LockKeyhole, Pencil, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import type { TerraPoint } from "@/lib/modes/types";
import { toFavouriteKey } from "@/lib/persistence/favouriteKeys";
import type { FavouriteFolderDto } from "@/lib/persistence/types";
import { absoluteShareLink, folderSharePath } from "@/lib/sharing/links";
import { DrawerHeader } from "../drawer/DrawerHeader";
import { PointActionMenu } from "../drawer/PointActionMenu";
import { ShareDialog } from "../sharing/ShareDialog";
import { ModalShell } from "../ui/ModalShell";
import { FavouriteFolderForm } from "./FavouriteFolderForm";

export function FavouriteFolderDetail({ activePlaybackPointKey, folder, loading, onBack, onDelete, onInspect, onPlay, onRemove, onRevokeShare, onShare, onSharePoint, onUpdate }: {
  activePlaybackPointKey: string | null; folder: FavouriteFolderDto | null; loading: boolean; onBack: () => void;
  onDelete: (folderId: string) => Promise<boolean>; onInspect: (point: TerraPoint) => void; onPlay: (point: TerraPoint) => void;
  onRemove: (folderId: string, point: TerraPoint) => Promise<void>; onRevokeShare: (folderId: string) => Promise<boolean>;
  onShare: (folderId: string) => Promise<string | null>; onSharePoint: (point: TerraPoint) => void;
  onUpdate: (folderId: string, name: string, description: string | null) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false); const [deleting, setDeleting] = useState(false); const [shareLink, setShareLink] = useState<string | null>(null);
  return <div className="favourites-view" aria-label={folder?.name ?? "Favourite folder"}>
    <DrawerHeader className="favourites-header" title={folder?.name ?? "Folder"} subtitle={folder?.description ?? (loading ? "Loading folder" : "No description")} actions={<button className="icon-button" type="button" aria-label="Back to folders" onClick={onBack}><ChevronLeft size={17} aria-hidden="true" /></button>} />
    {folder ? <div className="folder-detail-actions">
      <button className="secondary-action compact-action" type="button" onClick={() => { void onShare(folder.id).then((token) => token && setShareLink(absoluteShareLink(folderSharePath(token), window.location.origin))); }}><Share2 size={15} aria-hidden="true" /> Share</button>
      <button className="secondary-action compact-action" type="button" onClick={() => setEditing(true)}><Pencil size={15} aria-hidden="true" /> Edit</button>
      {folder.isDefault ? <span className="protected-folder"><LockKeyhole size={14} aria-hidden="true" /> Protected</span> : <button className="secondary-action compact-action danger-action" type="button" onClick={() => setDeleting(true)}><Trash2 size={15} aria-hidden="true" /> Delete</button>}
    </div> : null}
    <div className="favourites-body">
      {loading ? <div className="empty-state">Loading folder</div> : null}
      {folder ? <>
        <dl className="folder-facts"><div><dt>Stations</dt><dd>{folder.itemCount}</dd></div><div><dt>Created</dt><dd>{formatDate(folder.createdAt)}</dd></div><div><dt>Last activity</dt><dd>{formatDate(folder.updatedAt)}</dd></div><div><dt>Sharing</dt><dd>{folder.isShared ? "Link active" : "Private"}</dd></div>{folder.isImported ? <div><dt>Origin</dt><dd><Import size={13} aria-hidden="true" /> Imported {formatDate(folder.importedAt!)}</dd></div> : null}</dl>
        {editing ? <FavouriteFolderForm title="Edit folder" submitLabel="Save changes" initialName={folder.name} initialDescription={folder.description ?? ""} nameLocked={folder.isDefault} onCancel={() => setEditing(false)} onSubmit={async (name, description) => { const ok = await onUpdate(folder.id, name, description); if (ok) setEditing(false); return ok; }} /> : null}
        {folder.items.length === 0 ? <div className="favourites-empty"><strong>This folder is empty</strong><span>Use a station’s star button to add it here.</span></div> : <div className="folder-station-list">{folder.items.map((item) => <div className={`favourite-row ${activePlaybackPointKey === toFavouriteKey(item) ? "playback-active" : ""}`} key={`${item.modeId}:${item.pointId}`}><button className="favourite-row-main" type="button" onClick={() => onPlay(item.point)}><span><strong>{item.point.name}</strong><span>{item.point.summary}</span></span></button><PointActionMenu point={item.point} onInfo={onInspect} onShare={onSharePoint} onDelete={(point) => void onRemove(folder.id, point)} /></div>)}</div>}
      </> : null}
    </div>
    {deleting && folder ? <ModalShell kicker="Confirm" title={`Delete ${folder.name}?`} onClose={() => setDeleting(false)}><p>Stations saved only here will leave your favourites.</p><div className="confirm-actions"><button className="primary-action danger-action" type="button" onClick={() => void onDelete(folder.id).then((ok) => { if (ok) onBack(); })}>Delete folder</button><button className="secondary-action" type="button" onClick={() => setDeleting(false)}>Not now</button></div></ModalShell> : null}
    {shareLink && folder ? <ShareDialog link={shareLink} title={folder.name} onClose={() => setShareLink(null)} onStopSharing={() => onRevokeShare(folder.id).then(() => undefined)} /> : null}
  </div>;
}
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)); }
