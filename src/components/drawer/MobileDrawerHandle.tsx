"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { DrawerMobilePosition } from "../shell/drawerState";
import {
  clampMobileSheetHeight,
  getAdjacentDrawerPosition,
  getMobileDrawerHeight,
  getMobileGlobeOffset,
  getMobileSheetMetrics,
  resolveMobileDrawerDetent,
  type MobileSheetMetrics
} from "./mobileSheetMetrics";

type MobileDrawerHandleProps = {
  mobilePosition: DrawerMobilePosition;
  shellRef: RefObject<HTMLElement | null>;
  onMobilePositionChange: (position: DrawerMobilePosition) => void;
};

type DragState = {
  currentHeight: number;
  lastPointerY: number;
  lastTimestamp: number;
  pointerId: number;
  startHeight: number;
  startPointerY: number;
  targetHeight: number;
  velocity: number;
};

const DRAG_DISTANCE_RESPONSE = 0.82;
const DRAG_DAMPING = 0.3;

export function MobileDrawerHandle({
  mobilePosition,
  onMobilePositionChange,
  shellRef
}: MobileDrawerHandleProps) {
  const dragState = useRef<DragState | null>(null);
  const animationFrame = useRef<number | null>(null);
  const metricsRef = useRef<MobileSheetMetrics | null>(null);

  const applyHeight = useCallback((height: number, metrics: MobileSheetMetrics) => {
    const shell = shellRef.current;

    if (!shell) {
      return;
    }

    shell.style.setProperty("--mobile-player-height", `${metrics.playerHeight}px`);
    shell.style.setProperty("--mobile-sheet-max-height", `${metrics.fullHeight}px`);
    shell.style.setProperty("--mobile-sheet-visible-height", `${height}px`);
    shell.style.setProperty("--mobile-globe-offset-y", `${getMobileGlobeOffset(height, metrics)}px`);
  }, [shellRef]);

  const stopAnimation = useCallback(() => {
    if (animationFrame.current !== null) {
      window.cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
  }, []);

  const animateDrag = useCallback(() => {
    const state = dragState.current;
    const metrics = metricsRef.current;

    if (!state || !metrics) {
      animationFrame.current = null;
      return;
    }

    state.currentHeight += (state.targetHeight - state.currentHeight) * DRAG_DAMPING;
    applyHeight(state.currentHeight, metrics);

    if (Math.abs(state.targetHeight - state.currentHeight) > 0.25) {
      animationFrame.current = window.requestAnimationFrame(animateDrag);
    } else {
      state.currentHeight = state.targetHeight;
      applyHeight(state.currentHeight, metrics);
      animationFrame.current = null;
    }
  }, [applyHeight]);

  const syncSettledLayout = useCallback(() => {
    const metrics = getMobileSheetMetrics();
    metricsRef.current = metrics;
    applyHeight(getMobileDrawerHeight(mobilePosition, metrics), metrics);
  }, [applyHeight, mobilePosition]);

  useEffect(() => {
    syncSettledLayout();
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(syncSettledLayout);
    const player = document.querySelector(".media-mini-player");
    const nav = document.querySelector(".shell-mobile-nav");

    if (player instanceof HTMLElement) {
      resizeObserver?.observe(player);
    }
    if (nav instanceof HTMLElement) {
      resizeObserver?.observe(nav);
    }

    window.addEventListener("resize", syncSettledLayout);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncSettledLayout);
      stopAnimation();
    };
  }, [stopAnimation, syncSettledLayout]);

  const startMobileDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const metrics = getMobileSheetMetrics();
    const startHeight = getMobileDrawerHeight(mobilePosition, metrics);

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    metricsRef.current = metrics;
    dragState.current = {
      currentHeight: startHeight,
      lastPointerY: event.clientY,
      lastTimestamp: event.timeStamp,
      pointerId: event.pointerId,
      startHeight,
      startPointerY: event.clientY,
      targetHeight: startHeight,
      velocity: 0
    };
    shellRef.current?.setAttribute("data-mobile-drawer-dragging", "true");
  }, [mobilePosition, shellRef]);

  const moveMobileDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    const metrics = metricsRef.current;

    if (!state || !metrics || state.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const elapsed = Math.max(1, event.timeStamp - state.lastTimestamp);
    const pointerDelta = state.lastPointerY - event.clientY;
    state.velocity = pointerDelta / elapsed;
    state.lastPointerY = event.clientY;
    state.lastTimestamp = event.timeStamp;
    state.targetHeight = clampMobileSheetHeight(
      state.startHeight + (state.startPointerY - event.clientY) * DRAG_DISTANCE_RESPONSE,
      metrics
    );

    if (animationFrame.current === null) {
      animationFrame.current = window.requestAnimationFrame(animateDrag);
    }
  }, [animateDrag]);

  const endMobileDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    const metrics = metricsRef.current;

    if (!state || !metrics || state.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    stopAnimation();
    dragState.current = null;
    shellRef.current?.removeAttribute("data-mobile-drawer-dragging");
    const position = resolveMobileDrawerDetent({
      height: state.targetHeight,
      heightVelocity: state.velocity,
      metrics
    });

    applyHeight(getMobileDrawerHeight(position, metrics), metrics);
    onMobilePositionChange(position);
  }, [applyHeight, onMobilePositionChange, shellRef, stopAnimation]);

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
      onPointerCancel={endMobileDrag}
      onPointerDown={startMobileDrag}
      onPointerMove={moveMobileDrag}
      onPointerUp={endMobileDrag}
    >
      <span aria-hidden="true" />
    </button>
  );
}
