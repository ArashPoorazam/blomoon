"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import type { TerraPoint } from "@/lib/modes/types";
import type { FavouriteFolderSummaryDto } from "@/lib/persistence/types";
import { FolderSummary } from "./FolderSummary";
import { FavouriteFolderForm } from "./FavouriteFolderForm";
import { ModalShell } from "../ui/ModalShell";

type FavouriteFolderPickerProps = {
  folders: FavouriteFolderSummaryDto[];
  loading: boolean;
  loadError: boolean;
  onRetry: () => void;
  point: TerraPoint;
  selectedFolderIds: Set<string>;
  onAddToFolder: (folderId: string, point: TerraPoint) => Promise<void>;
  onClose: () => void;
  onCreateFolder: (name: string, description: string | null, modeId: string) => Promise<FavouriteFolderSummaryDto | null>;
  onRemoveFromFolder: (folderId: string, point: TerraPoint) => Promise<void>;
};

export function FavouriteFolderPicker({
  folders,
  loading,
  loadError,
  onRetry,
  onAddToFolder,
  onClose,
  onCreateFolder,
  onRemoveFromFolder,
  point,
  selectedFolderIds
}: FavouriteFolderPickerProps) {
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyListId, setBusyListId] = useState<string | null>(null);

  return (
    <ModalShell className="favourite-picker" subtitle="Save station · Choose one or more folders" title={point.name} onClose={onClose}>
      <div className="favourite-picker-list" aria-busy={loading}>
          {loading ? <p role="status">Loading folders…</p> : null}
          {loadError ? <div role="alert"><p>Could not load your folders. Please try again.</p><button className="secondary-action compact-action" type="button" onClick={onRetry}>Retry</button></div> : null}
          {creating ? (
            <FavouriteFolderForm
              modeId={point.modeId}
              submitLabel="Create"
              title="Create new folder"
              onCancel={() => setCreating(false)}
              onSubmit={async (name, description) => {
                const folder = await onCreateFolder(name, description, point.modeId);
                if (!folder) return false;
                await onAddToFolder(folder.id, point);
                setCreating(false);
                return true;
              }}
            />
          ) : !loadError ? folders.filter((folder) => folder.modeId === point.modeId).map((folder) => {
            const selected = selectedFolderIds.has(folder.id);

            return (
              <button
                aria-pressed={selected}
                className={`favourite-picker-option ${selected ? "selected" : ""}`}
                disabled={loading || busyListId !== null}
                key={folder.id}
                type="button"
                onClick={() => {
                  setError(null);
                  setBusyListId(folder.id);
                  const action = selected ? onRemoveFromFolder : onAddToFolder;
                  void action(folder.id, point).catch(() => setError("Could not update this folder. Please try again.")).finally(() => setBusyListId(null));
                }}
              >
                <FolderSummary folder={folder} />
                <span className="folder-selection" aria-hidden="true">{selected ? <Check size={16} /> : null}</span>
              </button>
            );
          }) : null}
        </div>

        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {!creating ? (
          <button className="secondary-action compact-action" disabled={loading || loadError} type="button" onClick={() => setCreating(true)}>
            <Plus size={15} aria-hidden="true" />
            <span>Create new folder</span>
          </button>
        ) : null}
    </ModalShell>
  );
}
