"use client";

import { useCallback, type KeyboardEvent } from "react";
import type { DrawerMobilePosition } from "../shell/drawerState";
import { getAdjacentDrawerPosition } from "./mobileSheetMetrics";

type MobileDrawerHandleProps = {
  mobilePosition: DrawerMobilePosition;
  onMobilePositionChange: (position: DrawerMobilePosition) => void;
};

export function MobileDrawerHandle({ mobilePosition, onMobilePositionChange }: MobileDrawerHandleProps) {
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    let nextPosition: DrawerMobilePosition | null = null;

    if (event.key === "ArrowUp") {
      nextPosition = getAdjacentDrawerPosition(mobilePosition, "open");
    } else if (event.key === "ArrowDown") {
      nextPosition = getAdjacentDrawerPosition(mobilePosition, "close");
    } else if (event.key === "Home") {
      nextPosition = "closed";
    } else if (event.key === "End") {
      nextPosition = "full";
    }

    if (!nextPosition) {
      return;
    }

    event.preventDefault();
    onMobilePositionChange(nextPosition);
  }, [mobilePosition, onMobilePositionChange]);

  return (
    <button
      aria-label={`Adjust drawer height. Current position: ${mobilePosition}`}
      className="drawer-sheet-handle"
      type="button"
      onKeyDown={handleKeyDown}
    >
      <span aria-hidden="true" />
    </button>
  );
}
