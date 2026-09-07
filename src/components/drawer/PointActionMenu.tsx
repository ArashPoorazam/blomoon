"use client";

import { Info, Share2, Trash2 } from "lucide-react";
import type { TerraPoint } from "@/lib/modes/types";
import { AnchoredMenu } from "../ui/AnchoredMenu";

type PointActionMenuProps = {
  point: TerraPoint;
  onInfo: (point: TerraPoint) => void;
  onShare: (point: TerraPoint) => void;
  onDelete?: (point: TerraPoint) => void;
};

export function PointActionMenu({ onDelete, onInfo, onShare, point }: PointActionMenuProps) {
  return <AnchoredMenu label={`More options for ${point.name}`} items={[
    { icon: Info, label: "Info", onSelect: () => onInfo(point) },
    { icon: Share2, label: "Share", onSelect: () => onShare(point) },
    ...(onDelete ? [{ icon: Trash2, label: "Delete from folder", onSelect: () => onDelete(point), tone: "danger" as const }] : [])
  ]} />;
}
