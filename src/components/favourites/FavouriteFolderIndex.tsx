"use client";

import { ChevronLeft, FolderHeart, Plus } from "lucide-react";
import { useState } from "react";
import type { FavouriteFolderSummaryDto } from "@/lib/persistence/types";
import { DrawerHeader } from "../drawer/DrawerHeader";
import { FolderSummary } from "./FolderSummary";
import { FavouriteFolderForm } from "./FavouriteFolderForm";

export function FavouriteFolderIndex({ canGoBack, folders, loading, onBack, onCreate, onOpen }: {
  canGoBack: boolean; folders: FavouriteFolderSummaryDto[]; loading: boolean; onBack: () => void;
  onCreate: (name: string, description: string | null) => Promise<FavouriteFolderSummaryDto | null>;
  onOpen: (folderId: string) => void;
}) {
  const [creating, setCreating] = useState(false); const stations = folders.reduce((sum, folder) => sum + folder.itemCount, 0);
  return <div className="favourites-view" aria-label="Favourites folders">
    <DrawerHeader className="favourites-header" title="Favourites" subtitle={loading ? "Loading folders" : `${folders.length} ${folders.length === 1 ? "folder" : "folders"} · ${stations} ${stations === 1 ? "station" : "stations"}`} actions={canGoBack ? <button className="icon-button" type="button" aria-label="Back" onClick={onBack}><ChevronLeft size={17} aria-hidden="true" /></button> : undefined} />
    <div className="favourites-actions"><button className="primary-action new-folder-action" type="button" onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" /> New folder</button></div>
    <div className="favourites-body">
      {creating ? <FavouriteFolderForm title="Create folder" submitLabel="Create folder" onCancel={() => setCreating(false)} onSubmit={async (name, description) => { const folder = await onCreate(name, description); if (!folder) return false; setCreating(false); onOpen(folder.id); return true; }} /> : null}
      {loading ? <div className="empty-state">Loading favourites</div> : null}
      {!loading && folders.length === 0 ? <div className="favourites-empty"><FolderHeart size={22} aria-hidden="true" /><strong>No folders yet</strong><span>Your protected Favourites folder will appear here.</span></div> : null}
      <div className="favourite-folder-grid">{folders.map((folder) => <button className="favourite-folder-card" key={folder.id} type="button" onClick={() => onOpen(folder.id)}>
        <FolderSummary folder={folder} />
      </button>)}</div>
    </div>
  </div>;
}
