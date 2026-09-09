"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type InstallState = {
  installed: boolean;
  ready: boolean;
  ios: boolean;
  canPrompt: boolean;
  prompt: () => Promise<boolean>;
};
const InstallContext = createContext<InstallState | null>(null);

export function InstallProvider({ children }: { children: ReactNode }) {
  const pending = useRef<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ready, setReady] = useState(false);
  const [ios, setIos] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const appleStandalone = "standalone" in navigator && navigator.standalone === true;
    setInstalled(display.matches || appleStandalone);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setReady(true);
    const capture = (event: Event) => {
      event.preventDefault();
      pending.current = event as InstallPrompt;
      setCanPrompt(true);
    };
    const completed = () => {
      pending.current = null;
      setCanPrompt(false);
      setInstalled(true);
    };
    const displayChanged = () => setInstalled(display.matches || appleStandalone);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", completed);
    display.addEventListener("change", displayChanged);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        console.warn("Blomoon offline support could not be registered.");
      });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", completed);
      display.removeEventListener("change", displayChanged);
    };
  }, []);

  async function prompt() {
    const event = pending.current;
    if (!event) return false;
    pending.current = null;
    setCanPrompt(false);
    try {
      await event.prompt();
      await event.userChoice;
      return true;
    } catch {
      return false;
    }
  }

  return <InstallContext.Provider value={{ installed, ready, ios, canPrompt, prompt }}>{children}</InstallContext.Provider>;
}

export function useInstall() {
  const value = useContext(InstallContext);
  if (!value) throw new Error("Install controls require InstallProvider.");
  return value;
}
