"use client";

import { Info, MoreHorizontal } from "lucide-react";
import { useId, useState } from "react";
import type { TerraPoint } from "@/lib/modes/types";

type PointActionMenuProps = {
  point: TerraPoint;
  onInfo: (point: TerraPoint) => void;
};

export function PointActionMenu({ onInfo, point }: PointActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  return (
    <div
      className="point-action-menu"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;

        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={`More options for ${point.name}`}
        className="point-action-trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div className="point-action-popover" id={menuId} role="menu">
          <button
            role="menuitem"
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setOpen(false);
              onInfo(point);
            }}
          >
            <Info size={14} aria-hidden="true" />
            <span>Info</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
