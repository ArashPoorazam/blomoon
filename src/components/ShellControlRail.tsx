"use client";

import { History, Star } from "lucide-react";
import type { TerraMode } from "@/lib/modes/types";
import { modeIcons } from "./shell/modeIcons";
import type { ShellDrawerView } from "./shell/drawerState";

type ShellControlRailProps = {
  activeMode: TerraMode;
  activeView: ShellDrawerView;
  modeSwitcherOpen: boolean;
  onOpenFavourites: () => void;
  onOpenHistory: () => void;
  onOpenModeSwitcher: () => void;
};

export function ShellControlRail({ activeMode, activeView, modeSwitcherOpen,
  onOpenFavourites, onOpenHistory, onOpenModeSwitcher }: ShellControlRailProps) {
  const ModeIcon = modeIcons[activeMode.controlIcon];
  return <nav className="shell-control-rail" aria-label="Blomoon shortcuts">
    <button className={`shell-square-control ${activeView === "favourites" || activeView === "favourite-folder" ? "active" : ""}`}
      type="button" aria-label="Open favourites" title="Favourites" onClick={onOpenFavourites}>
      <Star size={18} aria-hidden="true" />
    </button>
    <button aria-label="Open playback history" aria-pressed={activeView === "history"}
      className={`shell-square-control ${activeView === "history" ? "active" : ""}`}
      title="History" type="button" onClick={onOpenHistory}>
      <History size={18} aria-hidden="true" />
    </button>
    <button aria-label="Change mode" aria-haspopup="dialog" aria-expanded={modeSwitcherOpen}
      className={`shell-square-control ${modeSwitcherOpen ? "active" : ""}`}
      title="Change mode" type="button" onClick={onOpenModeSwitcher}>
      <ModeIcon size={19} aria-hidden="true" />
    </button>
  </nav>;
}
