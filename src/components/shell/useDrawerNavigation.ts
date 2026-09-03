"use client";

import { useCallback, useMemo, useState } from "react";
import {
  canGoBackFromDrawerStack,
  createDrawerStack,
  getCurrentDrawerView,
  openDrawerStackView,
  popDrawerStack,
  resolveDrawerMobilePosition,
  type DrawerMobilePosition,
  type ShellDrawerStack,
  type ShellDrawerView
} from "./drawerState";

export function useDrawerNavigation() {
  const [stack, setStack] = useState<ShellDrawerStack>(() => createDrawerStack("main"));
  const [collapsed, setCollapsed] = useState(false);
  const [mobilePosition, setMobilePosition] = useState<DrawerMobilePosition>("middle");
  const view = useMemo(() => getCurrentDrawerView(stack), [stack]);
  const canGoBack = useMemo(() => canGoBackFromDrawerStack(stack), [stack]);

  const open = useCallback((nextView: ShellDrawerView, nextMobilePosition: DrawerMobilePosition = "middle") => {
    setStack((currentStack) => openDrawerStackView(currentStack, nextView));
    setCollapsed(false);
    setMobilePosition((currentPosition) => resolveDrawerMobilePosition({
      currentPosition,
      requestedOpenPosition: nextMobilePosition
    }));
  }, []);

  const openContent = useCallback((nextView: ShellDrawerView) => {
    setStack((currentStack) => openDrawerStackView(currentStack, nextView));
  }, []);

  const replace = useCallback((nextView: ShellDrawerView, nextMobilePosition: DrawerMobilePosition = "middle") => {
    setStack(createDrawerStack(nextView));
    setCollapsed(false);
    setMobilePosition((currentPosition) => resolveDrawerMobilePosition({
      currentPosition,
      requestedOpenPosition: nextMobilePosition
    }));
  }, []);

  const replaceContent = useCallback((nextView: ShellDrawerView) => {
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
  }), [canGoBack, collapsed, goBack, mobilePosition, open, openContent, replace, replaceContent, stack, toggleCollapsed, view]);
}
