import { findTerraMode } from "@/lib/modes/registry";
import { modeIcons } from "../shell/modeIcons";

export function FolderModeBadge({ modeId }: { modeId: string }) {
  const mode = findTerraMode(modeId);
  if (!mode) return null;
  const Icon = modeIcons[mode.controlIcon];
  return <span className="folder-mode-badge" role="img" aria-label={mode.label} title={mode.label}>
    <Icon size={16} aria-hidden="true" />
  </span>;
}
