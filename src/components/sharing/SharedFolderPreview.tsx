"use client";

import { FolderHeart, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { FolderShareEntry } from "./useShareEntry";
import { ModalShell } from "../ui/ModalShell";

export function SharedFolderPreview({ entry, onClose, onImport }: { entry: FolderShareEntry; onClose: () => void; onImport: (token: string) => Promise<void> }) {
  const [importing, setImporting] = useState(false);
  return <ModalShell kicker="Shared folder" title={entry.preview?.name ?? "Folder preview"} onClose={onClose}>
    {entry.status === "loading" ? <div className="share-preview-status"><LoaderCircle className="spin" size={20} aria-hidden="true" /> Loading current folder information</div> : null}
    {entry.status === "unavailable" ? <div className="share-preview-status"><FolderHeart size={21} aria-hidden="true" /><strong>This shared folder is unavailable.</strong><span>The owner may have stopped sharing it, or the link is invalid.</span></div> : null}
    {entry.preview ? <><p>{entry.preview.description ?? "No description"}</p><div className="shared-folder-count">{entry.preview.itemCount} {entry.preview.itemCount === 1 ? "station" : "stations"}</div>{entry.preview.sampleStationNames.length ? <div className="shared-folder-samples"><strong>Sample stations</strong>{entry.preview.sampleStationNames.map((name) => <span key={name}>{name}</span>)}</div> : null}<div className="confirm-actions"><button className="primary-action" disabled={importing} type="button" onClick={() => { setImporting(true); void onImport(entry.token).finally(() => setImporting(false)); }}>{importing ? "Opening" : entry.isOwner ? "Open folder" : "Import folder"}</button><button className="secondary-action" type="button" onClick={onClose}>Not now</button></div></> : null}
  </ModalShell>;
}
