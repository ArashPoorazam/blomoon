"use client";

import { useCallback, useMemo, useState } from "react";
import {
  canGoBackFromDrawerStack,
  createDrawerStack,
  getCurrentDrawerEntry,
  getCurrentDrawerView,
  openDrawerStackView,
  popDrawerStack,
  resolveDrawerMobilePosition,
  type DrawerMobilePosition,
  type ShellDrawerEntry,
  type ShellDrawerStack,
  type ShellDrawerView
} from "./drawerState";

export function useDrawerNavigation() {
  const [stack, setStack] = useState<ShellDrawerStack>(() => createDrawerStack("main"));
  const [collapsed, setCollapsed] = useState(false);
  const [mobilePosition, setMobilePosition] = useState<DrawerMobilePosition>("middle");
  const view = useMemo(() => getCurrentDrawerView(stack), [stack]);
  const entry = useMemo(() => getCurrentDrawerEntry(stack), [stack]);
  const canGoBack = useMemo(() => canGoBackFromDrawerStack(stack), [stack]);

  const open = useCallback((nextEntry: ShellDrawerEntry, nextMobilePosition: DrawerMobilePosition = "middle") => {
    setStack((currentStack) => openDrawerStackView(currentStack, nextEntry));
    setCollapsed(false);
    setMobilePosition((currentPosition) => resolveDrawerMobilePosition({
      currentPosition,
      requestedOpenPosition: nextMobilePosition
    }));
  }, []);

  const openContent = useCallback((nextEntry: ShellDrawerEntry) => {
    setStack((currentStack) => openDrawerStackView(currentStack, nextEntry));
  }, []);

  const replace = useCallback((nextView: Exclude<ShellDrawerView, "favourite-folder" | "point-detail">, nextMobilePosition: DrawerMobilePosition = "middle") => {
    setStack(createDrawerStack(nextView));
    setCollapsed(false);
    setMobilePosition((currentPosition) => resolveDrawerMobilePosition({
      currentPosition,
      requestedOpenPosition: nextMobilePosition
    }));
  }, []);

  const replaceContent = useCallback((nextView: Exclude<ShellDrawerView, "favourite-folder" | "point-detail">) => {
    setStack(createDrawerStack(nextView));
  }, []);

  const goBack = useCallback(() => {
    setStack((currentStack) => popDrawerStack(currentStack));
    setCollapsed(false);
    setMobilePosition((currentPosition) => resolveDrawerMobilePosition({
      currentPosition,
      requestedOpenPosition: "middle"
    }));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => !value);
  }, []);

  return useMemo(() => ({
    canGoBack,
    collapsed,
    entry,
    goBack,
    mobilePosition,
    open,
    openContent,
    replace,
    replaceContent,
    setMobilePosition,
    stack,
    toggleCollapsed,
    view
  }), [canGoBack, collapsed, entry, goBack, mobilePosition, open, openContent, replace, replaceContent, stack, toggleCollapsed, view]);
}
