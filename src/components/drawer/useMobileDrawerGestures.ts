"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { DrawerMobilePosition } from "../shell/drawerState";
import { advanceDrawerListMomentum, DRAWER_DRAG_THRESHOLD, DRAWER_VELOCITY_MAX_AGE, moveDrawerGesture } from "./mobileDrawerMotion";
import { getMobileDrawerHeight, getMobileGlobeOffset, getMobileSheetMetrics, resolveMobileDrawerDetent } from "./mobileSheetMetrics";

const HEADER = ".drawer-header, .drawer-sheet-handle";
const LIST = ".point-list, .favourites-body";
const EXCLUDED = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="menu"], [role="listbox"], .drawer-search-controls';
const DRAG_DAMPING = 0.3;

type Gesture = {
  pointerId: number;
  surface: HTMLElement;
  list: HTMLElement | null;
  owner: "list" | "drawer";
  active: boolean;
  startX: number;
  startY: number;
  lastY: number;
  lastTimestamp: number;
  velocity: number;
  height: number;
};

export function useMobileDrawerGestures({ drawerRef, shellRef, mobilePosition, navigationKey, onMobilePositionChange }: {
  drawerRef: RefObject<HTMLElement | null>;
  shellRef: RefObject<HTMLElement | null>;
  mobilePosition: DrawerMobilePosition;
  navigationKey: string;
  onMobilePositionChange: (position: DrawerMobilePosition) => void;
}) {
  const suppressClick = useRef(false);
  useEffect(() => {
    const drawer = drawerRef.current;
    const shell = shellRef.current;
    if (!drawer || !shell) return;

    const mobile = window.matchMedia("(max-width: 760px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let metrics = getMobileSheetMetrics();
    let gesture: Gesture | null = null;
    let frame: number | null = null;
    let displayedHeight = getMobileDrawerHeight(mobilePosition, metrics);

    function applyHeight(height: number) {
      displayedHeight = height;
      shell!.style.setProperty("--mobile-player-height", `${metrics.playerHeight}px`);
      shell!.style.setProperty("--mobile-sheet-max-height", `${metrics.fullHeight}px`);
      shell!.style.setProperty("--mobile-sheet-visible-height", `${height}px`);
      shell!.style.setProperty("--mobile-globe-offset-y", `${getMobileGlobeOffset(height, metrics)}px`);
    }

    function stopAnimation() {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
    }

    function releaseGesture() {
      const previous = gesture;
      gesture = null;
      if (previous?.surface.hasPointerCapture(previous.pointerId)) previous.surface.releasePointerCapture(previous.pointerId);
      shell!.removeAttribute("data-mobile-drawer-dragging");
    }

    function syncLayout() {
      stopAnimation();
      releaseGesture();
      if (!mobile.matches) return;
      metrics = getMobileSheetMetrics();
      applyHeight(getMobileDrawerHeight(mobilePosition, metrics));
    }

    function animateDrag() {
      frame = null;
      if (!gesture) return;
      const difference = gesture.height - displayedHeight;
      applyHeight(reducedMotion.matches || Math.abs(difference) <= 0.25
        ? gesture.height : displayedHeight + difference * DRAG_DAMPING);
      if (displayedHeight !== gesture.height) frame = window.requestAnimationFrame(animateDrag);
    }

    function startMomentum(list: HTMLElement, initialVelocity: number) {
      if (reducedMotion.matches) return;
      let velocity = initialVelocity;
      let timestamp = performance.now();
      function tick(now: number) {
        frame = null;
        if (!list.isConnected || Math.abs(velocity) < 0.02) return;
        const next = advanceDrawerListMomentum(list.scrollTop, Math.max(0, list.scrollHeight - list.clientHeight), velocity, now - timestamp);
        list.scrollTop = next.scrollTop;
        velocity = next.velocity;
        timestamp = now;
        if (Math.abs(velocity) >= 0.02) frame = window.requestAnimationFrame(tick);
      }
      if (Math.abs(velocity) >= 0.02) frame = window.requestAnimationFrame(tick);
    }

    function pointerDown(event: PointerEvent) {
      // A second finger relinquishes the gesture to browser pinch zoom.
      if (gesture && event.pointerId !== gesture.pointerId) {
        syncLayout();
        return;
      }
      suppressClick.current = false;
      stopAnimation();
      if (!mobile.matches || !event.isPrimary || event.button !== 0 || !(event.target instanceof Element)) return;
      if (event.target.closest(EXCLUDED)) return;
      const header = event.target.closest<HTMLElement>(HEADER);
      const list = header ? null : event.target.closest<HTMLElement>(LIST);
      const surface = header ?? list;
      if (!surface || !drawer!.contains(surface) || (!header && event.pointerType === "mouse")) return;
      metrics = getMobileSheetMetrics();
      gesture = {
        pointerId: event.pointerId, surface, list, owner: header ? "drawer" : "list", active: false,
        startX: event.clientX, startY: event.clientY, lastY: event.clientY,
        lastTimestamp: event.timeStamp, velocity: 0, height: drawer!.getBoundingClientRect().height
      };
      displayedHeight = gesture.height;
    }

    function pointerMove(event: PointerEvent) {
      const state = gesture;
      if (!state || event.pointerId !== state.pointerId) return;
      if (!state.active) {
        const dx = Math.abs(event.clientX - state.startX);
        const dy = Math.abs(event.clientY - state.startY);
        if (Math.max(dx, dy) < DRAWER_DRAG_THRESHOLD) return;
        if (dx >= dy) { releaseGesture(); return; }
        state.active = true;
        suppressClick.current = true;
        state.surface.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      const deltaY = event.clientY - state.lastY;
      const next = moveDrawerGesture({
        deltaY, height: state.height, owner: state.owner,
        scrollTop: state.list?.scrollTop ?? 0,
        scrollMax: Math.max(0, (state.list?.scrollHeight ?? 0) - (state.list?.clientHeight ?? 0)), metrics
      });
      state.velocity = -deltaY / Math.max(1, event.timeStamp - state.lastTimestamp);
      state.lastY = event.clientY;
      state.lastTimestamp = event.timeStamp;
      state.owner = next.owner;
      state.height = next.height;
      if (state.list) state.list.scrollTop = next.scrollTop;
      if (state.owner === "drawer") {
        shell!.setAttribute("data-mobile-drawer-dragging", "true");
        if (reducedMotion.matches) applyHeight(state.height);
        else if (frame === null) frame = window.requestAnimationFrame(animateDrag);
      }
    }

    function pointerUp(event: PointerEvent) {
      const state = gesture;
      if (!state || state.pointerId !== event.pointerId) return;
      stopAnimation();
      releaseGesture();
      if (!state.active) return;
      const velocity = event.timeStamp - state.lastTimestamp > DRAWER_VELOCITY_MAX_AGE ? 0 : state.velocity;
      if (state.owner === "list" && state.list) startMomentum(state.list, velocity);
      else {
        const position = resolveMobileDrawerDetent({ height: state.height, heightVelocity: velocity, metrics });
        applyHeight(getMobileDrawerHeight(position, metrics));
        onMobilePositionChange(position);
      }
    }

    function cancelPointer(event: PointerEvent) {
      if (gesture?.pointerId === event.pointerId) syncLayout();
    }

    function lostPointerCapture(event: PointerEvent) {
      // Touch starts with implicit capture on the tapped child. Losing that
      // capture when we transfer it to the header/list is not cancellation.
      if (event.target === gesture?.surface) cancelPointer(event);
    }

    function click(event: MouseEvent) {
      // Keyboard/screen-reader activation has detail=0 and must always remain available.
      if (!suppressClick.current || event.detail === 0) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    let observedElements: Element[] = [];
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncLayout);
    function observeLayout() {
      const elements = [document.querySelector(".media-mini-player"), document.querySelector(".shell-mobile-nav"),
        drawer!.querySelector(".drawer-header"), drawer!.querySelector(".drawer-sheet-handle")]
        .filter((element): element is Element => element instanceof Element);
      if (gesture && !gesture.surface.isConnected) syncLayout();
      if (elements.length === observedElements.length && elements.every((element, index) => element === observedElements[index])) return;
      resizeObserver?.disconnect();
      elements.forEach((element) => resizeObserver?.observe(element));
      observedElements = elements;
      syncLayout();
    }
    const mutationObserver = new MutationObserver(observeLayout);
    observeLayout();
    mutationObserver.observe(shell, { childList: true, subtree: true });
    window.addEventListener("pointerdown", pointerDown, true);
    window.addEventListener("pointermove", pointerMove, { passive: false });
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", cancelPointer);
    drawer.addEventListener("lostpointercapture", lostPointerCapture);
    drawer.addEventListener("click", click, true);
    drawer.addEventListener("wheel", stopAnimation, { passive: true });
    window.addEventListener("resize", syncLayout);
    window.addEventListener("blur", syncLayout);
    mobile.addEventListener("change", syncLayout);
    reducedMotion.addEventListener("change", syncLayout);
    return () => {
      stopAnimation();
      releaseGesture();
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("pointerdown", pointerDown, true);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", cancelPointer);
      drawer.removeEventListener("lostpointercapture", lostPointerCapture);
      drawer.removeEventListener("click", click, true);
      drawer.removeEventListener("wheel", stopAnimation);
      window.removeEventListener("resize", syncLayout);
      window.removeEventListener("blur", syncLayout);
      mobile.removeEventListener("change", syncLayout);
      reducedMotion.removeEventListener("change", syncLayout);
    };
  }, [drawerRef, mobilePosition, navigationKey, onMobilePositionChange, shellRef]);
}
