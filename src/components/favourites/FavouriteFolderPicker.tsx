"use client";

import { Check, Plus, Star, X } from "lucide-react";
import { useState } from "react";
import type { TerraPoint } from "@/lib/modes/types";
import type { FavouriteFolderSummaryDto } from "@/lib/persistence/types";
import { FavouriteFolderForm } from "./FavouriteFolderForm";

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
    <div className="favourite-modal-backdrop" role="presentation">
      <section className="favourite-modal favourite-picker" role="dialog" aria-modal="true" aria-labelledby="favourite-picker-title">
        <div className="favourite-picker-header">
          <div>
            <div className="drawer-kicker">Save station</div>
            <h2 id="favourite-picker-title">{point.name}</h2>
            <p>Choose one or more folders.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close favourite picker" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="favourite-picker-list">
          {folders.map((folder) => {
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
                <Star size={16} aria-hidden="true" />
                <span>
                  <strong>{folder.name}</strong>
                  <span>{formatListCount(folder.itemCount)}</span>
                </span>
                {selected ? <Check size={16} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        {creating ? (
          <FavouriteFolderForm
            submitLabel="Create"
            title="Create new folder"
            onCancel={() => setCreating(false)}
            onSubmit={async (name, description) => {
              const folder = await onCreateFolder(name, description);
              if (folder) {
                await onAddToFolder(folder.id, point);
                setCreating(false);
                return true;
              }
              return false;
            }}
          />
        ) : (
          <button className="secondary-action compact-action" type="button" onClick={() => setCreating(true)}>
            <Plus size={15} aria-hidden="true" />
            <span>Create new folder</span>
          </button>
        )}
      </section>
    </div>
  );
}

function formatListCount(count: number) {
  return count === 1 ? "1 item" : `${count} items`;
}
