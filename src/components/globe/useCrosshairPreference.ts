"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "blomoon.crosshair.v1";

export function useCrosshairPreference() {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    try { setEnabled(localStorage.getItem(STORAGE_KEY) !== "off"); } catch { /* Storage is optional. */ }
  }, []);
  const toggle = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, enabled ? "off" : "on"); } catch { /* Storage is optional. */ }
    setEnabled(!enabled);
  }, [enabled]);
  return { enabled, toggle };
}
