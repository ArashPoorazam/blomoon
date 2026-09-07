"use client";

import { Earth, History, MapPin, Star } from "lucide-react";
import type { MouseEvent } from "react";
import type { TerraMode, TerraModeId } from "@/lib/modes/types";
import { modeIcons } from "./shell/modeIcons";
import type { ShellDrawerView } from "./shell/drawerState";

type ShellControlRailProps = {
  activeModeId: TerraModeId;
  activeView: ShellDrawerView;
  earthSpinEnabled: boolean;
  earthSpinDisabled: boolean;
  modes: TerraMode[];
  showListedOnGlobe: boolean;
  onOpenFavourites: () => void;
  onOpenHistory: () => void;
  onModeSelect: (modeId: TerraModeId) => void;
  onToggleEarthSpin: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggleShowListedOnGlobe: () => void;
};

export type ModeControlItem = {
  active: boolean;
  icon: TerraMode["controlIcon"];
  id: TerraModeId;
  label: string;
};

export function ShellControlRail({
  activeModeId,
  activeView,
  earthSpinEnabled,
  earthSpinDisabled,
  modes,
  onToggleShowListedOnGlobe,
  onOpenFavourites,
  onOpenHistory,
  onModeSelect,
  onToggleEarthSpin,
  showListedOnGlobe
}: ShellControlRailProps) {
  const modeControls = getModeControlItems(modes, activeModeId);

  return (
    <nav className="shell-control-rail" aria-label="Blomoon shortcuts">
      <button
        className={`shell-square-control ${activeView === "favourites" || activeView === "favourite-folder" ? "active" : ""}`}
        type="button"
        aria-label="Open favourites"
        title="Favourites"
        onClick={onOpenFavourites}
      >
        <Star size={18} aria-hidden="true" />
      </button>
      <button
        aria-label="Open playback history"
        aria-pressed={activeView === "history"}
        className={`shell-square-control ${activeView === "history" ? "active" : ""}`}
        title="History"
        type="button"
        onClick={onOpenHistory}
      >
        <History size={18} aria-hidden="true" />
      </button>
      <button
        className="shell-square-control"
        aria-label={showListedOnGlobe ? "Show default globe points" : "Display listed points on globe"}
        aria-pressed={showListedOnGlobe}
        title="Display listed points on globe"
        type="button"
        onClick={onToggleShowListedOnGlobe}
      >
        <MapPin size={18} aria-hidden="true" />
      </button>
      <button
        className="shell-square-control"
        data-earth-spin-toggle
        disabled={earthSpinDisabled}
        type="button"
        aria-label={earthSpinDisabled ? "Globe spin unavailable" : earthSpinEnabled ? "Stop globe spin" : "Start globe spin"}
        aria-pressed={earthSpinEnabled}
        title="Globe spin"
        onClick={onToggleEarthSpin}
      >
        <Earth size={18} aria-hidden="true" />
      </button>
      {modeControls.map((mode) => {
        const ModeIcon = modeIcons[mode.icon];

        return (
          <button
            aria-current={mode.active ? "page" : undefined}
            aria-label={`${mode.label} mode`}
            className={`shell-square-control ${mode.active ? "active" : ""}`}
            key={mode.id}
            title={mode.label}
            type="button"
            onClick={() => onModeSelect(mode.id)}
          >
            <ModeIcon size={18} aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}

export function getModeControlItems(modes: TerraMode[], activeModeId: TerraModeId): ModeControlItem[] {
  return modes.map((mode) => ({
    active: mode.id === activeModeId,
    icon: mode.controlIcon,
    id: mode.id,
    label: mode.label
  }));
}
