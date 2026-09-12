"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { History, Star, UserCircle } from "lucide-react";
import blomoonFullLogo from "@/assets/images/full_logo/Blomoon_Full_Logo.png";
import type { TerraMode } from "@/lib/modes/types";
import type { ShellDrawerView } from "./drawerState";
import { getMainDrawer, MAIN_DRAWERS, type MainDrawer } from "./mainDrawerNavigation";
import { useDrawerMotion, type DrawerMotion } from "../drawer/useDrawerTransition";
import { modeIcons } from "./modeIcons";

type IndicatorBounds = { left: number; top: number; width: number; height: number; radius: number };

export function ShellMobileNav({ activeMode, activeView, motion, onNavigate }: {
  activeMode: TerraMode;
  activeView: ShellDrawerView;
  motion: DrawerMotion;
  onNavigate: (target: MainDrawer) => void;
}) {
  const transition = useDrawerMotion(motion);
  const navRef = useRef<HTMLElement>(null);
  const [bounds, setBounds] = useState<IndicatorBounds[]>([]);
  const active = getMainDrawer(activeView);
  const ModeIcon = modeIcons[activeMode.controlIcon];
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => setBounds(Array.from(nav.querySelectorAll<HTMLButtonElement>("button")).map((button) => {
      const logo = button.dataset.drawer === "main";
      return { left: button.offsetLeft, top: button.offsetTop + (logo ? button.offsetHeight - 2 : 0),
        width: button.offsetWidth, height: logo ? 2 : button.offsetHeight, radius: logo ? 0 : parseFloat(getComputedStyle(button).borderRadius) || 0 };
    }));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);
  const from = bounds[MAIN_DRAWERS.indexOf(active)];
  const to = transition?.target ? bounds[MAIN_DRAWERS.indexOf(transition.target)] : from;
  const progress = transition?.target ? transition.progress : 0;
  const interpolate = (key: keyof IndicatorBounds) => from && to ? from[key] + (to[key] - from[key]) * progress : 0;
  const items = {
    "mode-switcher": { label: "Change mode", icon: <ModeIcon size={19} aria-hidden="true" /> },
    history: { label: `${activeMode.label} playback history`, icon: <History size={19} aria-hidden="true" /> },
    main: { label: "Blomoon", icon: <Image alt="" className="shell-mobile-logo" priority sizes="120px" src={blomoonFullLogo} /> },
    favourites: { label: "Favourites", icon: <Star size={19} aria-hidden="true" /> },
    account: { label: "Account", icon: <UserCircle size={20} aria-hidden="true" /> }
  } satisfies Record<MainDrawer, { label: string; icon: ReactNode }>;

  return <nav ref={navRef} className="shell-mobile-nav" aria-label="Blomoon mobile navigation">
    {from && <span className="shell-mobile-nav-indicator" aria-hidden="true" data-tracking={Boolean(transition)}
      style={{ transform: `translate(${interpolate("left")}px, ${interpolate("top")}px)`,
        width: interpolate("width"), height: interpolate("height"), borderRadius: interpolate("radius") }} />}
    {MAIN_DRAWERS.map((id) => <button key={id} data-drawer={id}
      aria-label={items[id].label} aria-current={active === id ? "page" : undefined}
      aria-pressed={active === id}
      className={id === "main" ? "shell-mobile-logo-button" : `shell-mobile-nav-button ${active === id ? "active" : ""}`}
      type="button" onClick={() => onNavigate(id)}>{items[id].icon}</button>)}
  </nav>;
}
