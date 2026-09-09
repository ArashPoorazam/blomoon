import { FolderModeBadge } from "./FolderModeBadge";
import { Import, LockKeyhole } from "lucide-react";
import type { FavouriteFolderSummaryDto } from "@/lib/persistence/types";

export function FolderSummary({ folder }: { folder: FavouriteFolderSummaryDto }) {
  return <span className="folder-summary">
    <span className="folder-summary-main">
      <span className="folder-summary-copy">
        <strong>{folder.name}</strong>
        <span className="folder-summary-description">{folder.description || "No description"}</span>
      </span>
      <span className="folder-summary-meta">
        <span>Updated {formatFolderDate(folder.updatedAt)}</span>
        {folder.isDefault ? <span title="Protected folder"><LockKeyhole size={12} aria-hidden="true" /> Protected</span> : null}
        {folder.isImported ? <span title="Imported folder"><Import size={12} aria-hidden="true" /> Imported</span> : null}
      </span>
    </span>
    <span className="folder-summary-aside">
      <span className="folder-count">{folder.itemCount} {folder.itemCount === 1 ? "station" : "stations"}</span>
      <FolderModeBadge modeId={folder.modeId} />
    </span>
  </span>;
}

export function formatFolderDate(value: string) {
  return folderDateFormatter.format(new Date(value));
}

const folderDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
