"use client";

import { useCallback, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { DrawerMobilePosition } from "../shell/drawerState";

type MobileDrawerHandleProps = {
  mobilePosition: DrawerMobilePosition;
  onMobilePositionChange: (position: DrawerMobilePosition) => void;
  onMobileStyleChange: (style: CSSProperties | undefined) => void;
};

type MobileSheetStyle = CSSProperties & {
  "--mobile-sheet-height": string;
};

export function MobileDrawerHandle({
  mobilePosition,
  onMobilePositionChange,
  onMobileStyleChange
}: MobileDrawerHandleProps) {
  const [mobileHeight, setMobileHeight] = useState<number | null>(null);
  const dragState = useRef<{ pointerId: number; height: number } | null>(null);

  const setCustomHeight = useCallback((height: number) => {
    setMobileHeight(height);
    const style: MobileSheetStyle = { "--mobile-sheet-height": `${height}px` };

    onMobileStyleChange(style);
  }, [onMobileStyleChange]);

  const startMobileDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drawerElement = event.currentTarget.closest(".drawer");

    if (!(drawerElement instanceof HTMLElement)) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      height: drawerElement.getBoundingClientRect().height
    };
  }, []);

  const moveMobileDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    const metrics = getMobileSheetMetrics();
    const nextHeight = clamp(metrics.sheetBottom - event.clientY, metrics.minimumHeight, metrics.maximumHeight);

    setCustomHeight(nextHeight);
    onMobilePositionChange("custom");
  }, [onMobilePositionChange, setCustomHeight]);

  const endMobileDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    dragState.current = null;

    const metrics = getMobileSheetMetrics();
    const height = mobileHeight ?? state.height;
    const handleTop = metrics.sheetBottom - height;

    if (height <= metrics.closedHeight || handleTop >= metrics.closedTop) {
      setMobileHeight(null);
      onMobileStyleChange(undefined);
      onMobilePositionChange("closed");
      return;
    }

    if (handleTop <= metrics.fullTop || height >= metrics.maximumHeight - 28) {
      setMobileHeight(null);
      onMobileStyleChange(undefined);
      onMobilePositionChange("full");
      return;
    }

    setCustomHeight(clamp(height, metrics.minimumHeight, metrics.maximumHeight));
    onMobilePositionChange("custom");
  }, [mobileHeight, onMobilePositionChange, onMobileStyleChange, setCustomHeight]);

  if (mobilePosition === "closed") {
    return null;
  }

  return (
    <button
      aria-label="Adjust drawer height"
      className="drawer-sheet-handle"
      type="button"
      onPointerCancel={endMobileDrag}
      onPointerDown={startMobileDrag}
      onPointerMove={moveMobileDrag}
      onPointerUp={endMobileDrag}
    >
      <span aria-hidden="true" />
    </button>
  );
}

function getMobileSheetMetrics() {
  const viewportHeight = window.innerHeight;
  const navOffset = 72;
  const playerSpace = 104;
  const sheetBottom = viewportHeight - playerSpace;
  const maximumHeight = Math.max(220, viewportHeight - navOffset - playerSpace);

  return {
    closedHeight: 110,
    closedTop: sheetBottom - 118,
    fullTop: navOffset + 18,
    maximumHeight,
    minimumHeight: 150,
    sheetBottom
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
