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
  point: TerraPoint;
  selectedFolderIds: Set<string>;
  onAddToFolder: (folderId: string, point: TerraPoint) => Promise<void>;
  onClose: () => void;
  onCreateFolder: (name: string, description: string | null) => Promise<FavouriteFolderSummaryDto | null>;
  onRemoveFromFolder: (folderId: string, point: TerraPoint) => Promise<void>;
};

export function FavouriteFolderPicker({
  folders,
  onAddToFolder,
  onClose,
  onCreateFolder,
  onRemoveFromFolder,
  point,
  selectedFolderIds
}: FavouriteFolderPickerProps) {
  const [creating, setCreating] = useState(false);
  const [busyListId, setBusyListId] = useState<string | null>(null);

  return (
    <ModalShell className="favourite-picker" kicker="Save station · Choose one or more folders" title={point.name} onClose={onClose}>
        <div className="favourite-picker-list">
          {creating ? (
            <FavouriteFolderForm
              submitLabel="Create"
              title="Create new folder"
              onCancel={() => setCreating(false)}
              onSubmit={async (name, description) => {
                const folder = await onCreateFolder(name, description);
                if (!folder) return false;
                await onAddToFolder(folder.id, point);
                setCreating(false);
                return true;
              }}
            />
          ) : folders.map((folder) => {
            const selected = selectedFolderIds.has(folder.id);

            return (
              <button
                aria-pressed={selected}
                className={`favourite-picker-option ${selected ? "selected" : ""}`}
                disabled={busyListId === folder.id}
                key={folder.id}
                type="button"
                onClick={() => {
                  setBusyListId(folder.id);
                  const action = selected ? onRemoveFromFolder : onAddToFolder;
                  void action(folder.id, point).finally(() => setBusyListId(null));
                }}
              >
                <FolderSummary folder={folder} />
                <span className="folder-selection" aria-hidden="true">{selected ? <Check size={16} /> : null}</span>
              </button>
            );
          })}
        </div>

        {!creating ? (
          <button className="secondary-action compact-action" type="button" onClick={() => setCreating(true)}>
            <Plus size={15} aria-hidden="true" />
            <span>Create new folder</span>
          </button>
        ) : null}
    </ModalShell>
  );
}
