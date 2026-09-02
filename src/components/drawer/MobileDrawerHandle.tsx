"use client";

import { useCallback, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { DrawerMobilePosition } from "../shell/drawerState";
import { clampMobileSheetHeight, getMobileSheetMetrics } from "./mobileSheetMetrics";

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
  const dragState = useRef<{ currentHeight: number; pointerId: number; pointerOffset: number } | null>(null);
  const activeHeight = useRef<number | null>(null);

  const setCustomHeight = useCallback((height: number) => {
    activeHeight.current = height;
    setMobileHeight(height);
    const style: MobileSheetStyle = { "--mobile-sheet-height": `${height}px` };

    onMobileStyleChange(style);
  }, [onMobileStyleChange]);

  const startMobileDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drawerElement = event.currentTarget.closest(".drawer");

    if (!(drawerElement instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    const drawerRect = drawerElement.getBoundingClientRect();

    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      currentHeight: drawerRect.height,
      pointerId: event.pointerId,
      pointerOffset: event.clientY - drawerRect.top
    };
  }, []);

  const moveMobileDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const metrics = getMobileSheetMetrics();
    const nextTop = event.clientY - state.pointerOffset;
    const nextHeight = clampMobileSheetHeight(metrics.sheetBottom - nextTop, metrics);

    state.currentHeight = nextHeight;
    setCustomHeight(nextHeight);
    onMobilePositionChange("custom");
  }, [onMobilePositionChange, setCustomHeight]);

  const endMobileDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    dragState.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const metrics = getMobileSheetMetrics();
    const height = activeHeight.current ?? mobileHeight ?? state.currentHeight;
    const handleTop = metrics.sheetBottom - height;

    if (height <= metrics.closeSnapHeight) {
      setMobileHeight(null);
      activeHeight.current = null;
      onMobileStyleChange(undefined);
      onMobilePositionChange("closed");
      return;
    }

    if (handleTop <= metrics.fullTop || height >= metrics.fullSnapHeight) {
      setMobileHeight(null);
      activeHeight.current = null;
      onMobileStyleChange(undefined);
      onMobilePositionChange("full");
      return;
    }

    setCustomHeight(clampMobileSheetHeight(height, metrics));
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
