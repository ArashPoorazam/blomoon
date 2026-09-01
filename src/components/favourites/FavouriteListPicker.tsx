"use client";

import { Check, Plus, Star, X } from "lucide-react";
import { useState } from "react";
import type { TerraPoint } from "@/lib/modes/types";
import type { FavouriteListDto } from "@/lib/persistence/types";
import { FavouriteListForm } from "./FavouritesDrawer";

type FavouriteListPickerProps = {
  lists: FavouriteListDto[];
  point: TerraPoint;
  selectedListIds: Set<string>;
  onAddToList: (listId: string, point: TerraPoint) => Promise<void>;
  onClose: () => void;
  onCreateList: (name: string) => Promise<FavouriteListDto | null>;
  onRemoveFromList: (listId: string, point: TerraPoint) => Promise<void>;
};

export function FavouriteListPicker({
  lists,
  onAddToList,
  onClose,
  onCreateList,
  onRemoveFromList,
  point,
  selectedListIds
}: FavouriteListPickerProps) {
  const [creating, setCreating] = useState(lists.length === 0);
  const [busyListId, setBusyListId] = useState<string | null>(null);

  return (
    <div className="favourite-modal-backdrop" role="presentation">
      <section className="favourite-modal favourite-picker" role="dialog" aria-modal="true" aria-labelledby="favourite-picker-title">
        <div className="favourite-picker-header">
          <div>
            <div className="drawer-kicker">Save station</div>
            <h2 id="favourite-picker-title">{point.name}</h2>
            <p>Choose one or more lists.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close favourite picker" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="favourite-picker-list">
          {lists.map((list) => {
            const selected = selectedListIds.has(list.id);

            return (
              <button
                aria-pressed={selected}
                className={`favourite-picker-option ${selected ? "selected" : ""}`}
                disabled={busyListId === list.id}
                key={list.id}
                type="button"
                onClick={() => {
                  setBusyListId(list.id);
                  const action = selected ? onRemoveFromList : onAddToList;
                  void action(list.id, point).finally(() => setBusyListId(null));
                }}
              >
                <Star size={16} aria-hidden="true" fill={selected ? "currentColor" : "none"} />
                <span>
                  <strong>{list.name}</strong>
                  <span>{formatListCount(list.itemCount)}</span>
                </span>
                {selected ? <Check size={16} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        {creating ? (
          <FavouriteListForm
            submitLabel="Create"
            title="Create new list"
            onCancel={() => setCreating(false)}
            onSubmit={async (name) => {
              const list = await onCreateList(name);
              if (list) {
                await onAddToList(list.id, point);
                setCreating(false);
              }
            }}
          />
        ) : (
          <button className="secondary-action compact-action" type="button" onClick={() => setCreating(true)}>
            <Plus size={15} aria-hidden="true" />
            <span>Create new list</span>
          </button>
        )}
      </section>
    </div>
  );
}

function formatListCount(count: number) {
  return count === 1 ? "1 item" : `${count} items`;
}
