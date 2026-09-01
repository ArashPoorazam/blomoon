"use client";

import { Check, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import type { TerraModeId, TerraPoint } from "@/lib/modes/types";
import { toFavouriteKey } from "@/lib/persistence/favouriteKeys";
import type { FavouriteListDto } from "@/lib/persistence/types";

type FavouritesDrawerProps = {
  activePlaybackPointKey: string | null;
  lists: FavouriteListDto[];
  loading: boolean;
  onCreateList: (name: string) => Promise<FavouriteListDto | null>;
  onDeleteList: (listId: string) => Promise<void>;
  onFavouriteSelect: (modeId: TerraModeId, point: TerraPoint) => void;
  onRemoveFavouriteFromList: (listId: string, point: TerraPoint) => Promise<void>;
  onRenameList: (listId: string, name: string) => Promise<void>;
};

export function FavouritesDrawer({
  activePlaybackPointKey,
  lists,
  loading,
  onCreateList,
  onDeleteList,
  onFavouriteSelect,
  onRemoveFavouriteFromList,
  onRenameList
}: FavouritesDrawerProps) {
  const [creating, setCreating] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<FavouriteListDto | null>(null);
  const favouriteCount = lists.reduce((count, list) => count + list.itemCount, 0);

  return (
    <div className="favourites-view" aria-label="Favourites">
      <div className="favourites-header">
        <div>
          <div className="drawer-kicker">Saved</div>
          <h2>Favourites</h2>
          <p className="drawer-subtitle">{formatFavouriteCount(favouriteCount, loading)}</p>
        </div>
        <button className="primary-action compact-action" type="button" onClick={() => setCreating(true)}>
          <Plus size={15} aria-hidden="true" />
          <span>New list</span>
        </button>
      </div>

      <div className="favourites-body">
        {creating ? (
          <FavouriteListForm
            submitLabel="Create"
            title="Create new list"
            onCancel={() => setCreating(false)}
            onSubmit={async (name) => {
              const list = await onCreateList(name);
              if (list) {
                setCreating(false);
              }
            }}
          />
        ) : null}

        {loading ? <div className="empty-state">Loading favourites</div> : null}
        {!loading && lists.length === 0 && !creating ? (
          <div className="favourites-empty">
            <Star size={20} aria-hidden="true" />
            <strong>No lists yet</strong>
            <span>Create a list, then use the star beside a station to save it.</span>
          </div>
        ) : null}

        {lists.map((list) => (
          <section className="favourite-group" key={list.id}>
            {editingListId === list.id ? (
              <FavouriteListForm
                initialName={list.name}
                submitLabel="Save"
                title="Rename list"
                onCancel={() => setEditingListId(null)}
                onSubmit={async (name) => {
                  await onRenameList(list.id, name);
                  setEditingListId(null);
                }}
              />
            ) : (
              <div className="favourite-group-title">
                <span>{list.name}</span>
                <div className="favourite-list-actions">
                  <strong>{list.itemCount}</strong>
                  <button className="icon-button" type="button" aria-label={`Rename ${list.name}`} onClick={() => setEditingListId(list.id)}>
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                  <button className="icon-button" type="button" aria-label={`Delete ${list.name}`} onClick={() => setDeleteCandidate(list)}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {list.items.map((favourite) => (
              <div
                className={`favourite-row ${activePlaybackPointKey === toFavouriteKey(favourite) ? "playback-active" : ""}`}
                key={`${list.id}:${favourite.modeId}:${favourite.pointId}`}
              >
                <button
                  className="favourite-row-main"
                  type="button"
                  onClick={() => onFavouriteSelect(favourite.modeId, favourite.point)}
                >
                  <Star size={15} aria-hidden="true" fill="currentColor" />
                  <span>
                    <strong>{favourite.point.name}</strong>
                    <span>{favourite.point.summary}</span>
                  </span>
                </button>
                <button
                  className="favourite-remove"
                  type="button"
                  aria-label={`Remove ${favourite.point.name} from ${list.name}`}
                  onClick={() => {
                    void onRemoveFavouriteFromList(list.id, favourite.point);
                  }}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
          </section>
        ))}
      </div>

      {deleteCandidate ? (
        <FavouriteConfirmDialog
          title={`Delete ${deleteCandidate.name}?`}
          description="Saved points in this list will be removed from the list. Points that are also in another list stay saved."
          confirmLabel="Delete list"
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={async () => {
            await onDeleteList(deleteCandidate.id);
            setDeleteCandidate(null);
          }}
        />
      ) : null}
    </div>
  );
}

export function FavouriteListForm({
  initialName = "",
  onCancel,
  onSubmit,
  submitLabel,
  title
}: {
  initialName?: string;
  onCancel: () => void;
  onSubmit: (name: string) => Promise<void>;
  submitLabel: string;
  title: string;
}) {
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const trimmedName = name.trim();

  return (
    <form
      className="favourite-list-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!trimmedName) {
          return;
        }

        setSubmitting(true);
        void onSubmit(trimmedName).finally(() => setSubmitting(false));
      }}
    >
      <strong>{title}</strong>
      <input
        autoFocus
        maxLength={80}
        placeholder="List name"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="favourite-list-form-actions">
        <button className="primary-action compact-action" disabled={!trimmedName || submitting} type="submit">
          <Check size={15} aria-hidden="true" />
          <span>{submitting ? "Saving" : submitLabel}</span>
        </button>
        <button className="secondary-action compact-action" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function FavouriteConfirmDialog({
  confirmLabel,
  description,
  onCancel,
  onConfirm,
  title
}: {
  confirmLabel: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  title: string;
}) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="favourite-modal-backdrop" role="presentation">
      <section className="favourite-modal" role="dialog" aria-modal="true" aria-labelledby="favourite-confirm-title">
        <div>
          <div className="drawer-kicker">Confirm</div>
          <h2 id="favourite-confirm-title">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="confirm-actions">
          <button
            className="primary-action danger-action"
            disabled={submitting}
            type="button"
            onClick={() => {
              setSubmitting(true);
              void onConfirm().finally(() => setSubmitting(false));
            }}
          >
            {submitting ? "Deleting" : confirmLabel}
          </button>
          <button className="secondary-action" type="button" onClick={onCancel}>
            Not now
          </button>
        </div>
      </section>
    </div>
  );
}

function formatFavouriteCount(count: number, loading: boolean) {
  if (loading) {
    return "Loading saved items";
  }

  return count === 1 ? "1 saved item" : `${count} saved items`;
}
