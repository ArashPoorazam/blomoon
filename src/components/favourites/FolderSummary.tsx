import { Import, LockKeyhole } from "lucide-react";
import type { FavouriteFolderSummaryDto } from "@/lib/persistence/types";

export function FolderSummary({ folder }: { folder: FavouriteFolderSummaryDto }) {
  return <span className="folder-summary">
    <span className="folder-summary-heading"><strong>{folder.name}</strong><span className="folder-count">{folder.itemCount} {folder.itemCount === 1 ? "station" : "stations"}</span></span>
    <span className="folder-summary-description">{folder.description || "No description"}</span>
    <span className="folder-summary-meta">
      <span>Updated {formatFolderDate(folder.updatedAt)}</span>
      {folder.isDefault ? <span title="Protected folder"><LockKeyhole size={12} aria-hidden="true" /> Protected</span> : null}
      {folder.isImported ? <span title="Imported folder"><Import size={12} aria-hidden="true" /> Imported</span> : null}
    </span>
  </span>;
}

export function formatFolderDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}
