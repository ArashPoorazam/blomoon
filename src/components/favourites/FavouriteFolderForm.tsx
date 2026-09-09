"use client";

import { Check } from "lucide-react";
import { useState } from "react";

export function FavouriteFolderForm({ initialDescription = "", initialName = "", nameLocked = false, onCancel, onSubmit, submitLabel, title }: {
  initialDescription?: string; initialName?: string; onCancel: () => void;
  nameLocked?: boolean;
  onSubmit: (name: string, description: string | null) => Promise<boolean | void>; submitLabel: string; title: string;
}) {
  const [name, setName] = useState(initialName); const [description, setDescription] = useState(initialDescription); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState<string | null>(null);
  return <form className="favourite-folder-form" onSubmit={(event) => {
    event.preventDefault(); if (!name.trim()) return; setSubmitting(true); setError(null);
    void onSubmit(name.trim(), description.trim() || null).then((ok) => { if (ok === false) setError("That folder name is already in use."); }).catch(() => setError("Could not save the folder. Please try again.")).finally(() => setSubmitting(false));
  }}>
    <strong>{title}</strong>
    <label>Folder name<input autoFocus={!nameLocked} disabled={nameLocked} maxLength={80} type="text" value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label><span className="folder-description-label">Description <span>(optional)</span></span><textarea maxLength={240} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <span className="folder-description-count">{description.length}/240</span>
    {error ? <div className="form-error">{error}</div> : null}
    <div className="favourite-folder-form-actions"><button className="primary-action compact-action" disabled={!name.trim() || submitting} type="submit"><Check size={15} aria-hidden="true" />{submitting ? "Saving" : submitLabel}</button><button className="secondary-action compact-action" type="button" onClick={onCancel}>Cancel</button></div>
  </form>;
}
