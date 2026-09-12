"use client";

import { flushSync } from "react-dom";
import { useCallback, useEffect, useRef, useMemo, useSyncExternalStore } from "react";
import { DRAWER_SETTLE_MS, getAdjacentMainDrawer, getMainDrawer, MAIN_DRAWERS, shouldCommitDrawerSwipe, type MainDrawer } from "../shell/mainDrawerNavigation";
import type { ShellDrawerView } from "../shell/drawerState";

export type DrawerTransitionState = {
  target: MainDrawer | null;
  direction: number;
  progress: number;
};
export type DrawerMotion = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => DrawerTransitionState | null;
};
const getServerSnapshot = () => null;
export function useDrawerMotion(motion: DrawerMotion) {
  return useSyncExternalStore(motion.subscribe, motion.getSnapshot, getServerSnapshot);
}

export type HorizontalDrawerGesture = {
  begin: () => boolean;
  move: (distance: number, width: number) => void;
  end: (distance: number, velocity: number, width: number) => void;
  cancel: () => void;
};

export function useDrawerTransition(view: ShellDrawerView, navigationKey: string, onNavigate: (target: MainDrawer) => void) {
  const state = useRef<DrawerTransitionState | null>(null);
  const listeners = useRef(new Set<() => void>());
  const motion = useMemo<DrawerMotion>(() => ({
    subscribe(listener) { listeners.current.add(listener); return () => { listeners.current.delete(listener); }; },
    getSnapshot: () => state.current
  }), []);
  const frame = useRef<number | null>(null);
  const dragging = useRef(false);
  const latest = useRef({ view, onNavigate });
  useEffect(() => { latest.current = { view, onNavigate }; }, [view, onNavigate]);

  const update = useCallback((next: DrawerTransitionState | null) => {
    state.current = next;
    listeners.current.forEach((listener) => listener());
  }, []);
  const cancel = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    dragging.current = false;
    update(null);
  }, [update]);

  useEffect(() => {
    cancel();
    const mobile = matchMedia("(max-width: 760px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    window.addEventListener("resize", cancel);
    window.addEventListener("blur", cancel);
    mobile.addEventListener("change", cancel);
    reduced.addEventListener("change", cancel);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      window.removeEventListener("resize", cancel);
      window.removeEventListener("blur", cancel);
      mobile.removeEventListener("change", cancel);
      reduced.removeEventListener("change", cancel);
    };
  }, [navigationKey, cancel]);

  const settle = useCallback((commit: boolean) => {
    const initial = state.current;
    if (!initial) return;
    dragging.current = false;
    const finish = () => {
      frame.current = null;
      // Commit navigation and the external motion store together so the keyed
      // incoming page becomes current without an intermediate unmount.
      flushSync(() => {
        if (commit && initial.target) latest.current.onNavigate(initial.target);
        update(null);
      });
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
    const start = performance.now();
    const destination = commit ? 1 : 0;
    const tick = (now: number) => {
      const time = Math.min(1, (now - start) / DRAWER_SETTLE_MS);
      update({ ...initial, progress: initial.progress + (destination - initial.progress) * (1 - (1 - time) ** 3) });
      if (time < 1) frame.current = requestAnimationFrame(tick);
      else finish();
    };
    frame.current = requestAnimationFrame(tick);
  }, [update]);

  const navigate = useCallback((target: MainDrawer) => {
    if (state.current || dragging.current) return;
    const source = getMainDrawer(latest.current.view);
    if (!matchMedia("(max-width: 760px)").matches || source === target) {
      latest.current.onNavigate(target);
      return;
    }
    update({ target, direction: Math.sign(MAIN_DRAWERS.indexOf(target) - MAIN_DRAWERS.indexOf(source)), progress: 0 });
    settle(true);
  }, [settle, update]);

  const begin = useCallback(() => {
    if (state.current || dragging.current) return false;
    dragging.current = true;
    return true;
  }, []);
  const move = useCallback((distance: number, width: number) => {
    if (!dragging.current) return;
    const direction = distance < 0 ? 1 : -1;
    const target = getAdjacentMainDrawer(latest.current.view, direction);
    update({ target, direction, progress: Math.min(1, Math.abs(distance) / Math.max(1, width)) * (target ? 1 : 0.15) });
  }, [update]);
  const end = useCallback((distance: number, velocity: number, width: number) => {
    if (!dragging.current) return;
    if (!state.current) { cancel(); return; }
    settle(Boolean(state.current.target) && shouldCommitDrawerSwipe(distance, velocity, width));
  }, [cancel, settle]);

  const horizontal = useMemo(() => ({ begin, move, end, cancel }), [begin, move, end, cancel]);
  return { motion, navigate, horizontal };
}
