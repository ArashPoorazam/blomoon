"use client";

import { useCallback, useMemo, useState } from "react";
import {
  canGoBackFromDrawerStack,
  createDrawerStack,
  getCurrentDrawerView,
  openDrawerStackView,
  popDrawerStack,
  type DrawerMobilePosition,
  type ShellDrawerStack,
  type ShellDrawerView
} from "./drawerState";

export function useDrawerNavigation() {
  const [stack, setStack] = useState<ShellDrawerStack>(() => createDrawerStack("main"));
  const [collapsed, setCollapsed] = useState(false);
  const [mobilePosition, setMobilePosition] = useState<DrawerMobilePosition>("standard");
  const view = useMemo(() => getCurrentDrawerView(stack), [stack]);
  const canGoBack = useMemo(() => canGoBackFromDrawerStack(stack), [stack]);

  const open = useCallback((nextView: ShellDrawerView, nextMobilePosition: DrawerMobilePosition = "standard") => {
    setStack((currentStack) => openDrawerStackView(currentStack, nextView));
    setCollapsed(false);
    setMobilePosition(nextMobilePosition);
  }, []);

  const replace = useCallback((nextView: ShellDrawerView, nextMobilePosition: DrawerMobilePosition = "standard") => {
    setStack(createDrawerStack(nextView));
    setCollapsed(false);
    setMobilePosition(nextMobilePosition);
  }, []);

  const goBack = useCallback(() => {
    setStack((currentStack) => popDrawerStack(currentStack));
    setCollapsed(false);
    setMobilePosition("standard");
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
    replace,
    setMobilePosition,
    stack,
    toggleCollapsed,
    view
  }), [canGoBack, collapsed, goBack, mobilePosition, open, replace, stack, toggleCollapsed, view]);
}
