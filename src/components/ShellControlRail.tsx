"use client";

import { Earth, Podcast, Radio, Star, Tv, type LucideIcon } from "lucide-react";
import type { MouseEvent } from "react";
import type { TerraMode, TerraModeId } from "@/lib/modes/types";

type ShellControlRailProps = {
  activeModeId: TerraModeId;
  earthSpinEnabled: boolean;
  earthSpinDisabled: boolean;
  modes: TerraMode[];
  onOpenFavourites: () => void;
  onModeSelect: (modeId: TerraModeId) => void;
  onToggleEarthSpin: (event: MouseEvent<HTMLButtonElement>) => void;
};

export type ModeControlItem = {
  active: boolean;
  icon: TerraMode["controlIcon"];
  id: TerraModeId;
  label: string;
};

export function ShellControlRail({
  activeModeId,
  earthSpinEnabled,
  earthSpinDisabled,
  modes,
  onOpenFavourites,
  onModeSelect,
  onToggleEarthSpin
}: ShellControlRailProps) {
  const modeControls = getModeControlItems(modes, activeModeId);

  return (
    <nav className="shell-control-rail" aria-label="Blomoon shortcuts">
      <button
        className="shell-square-control"
        type="button"
        aria-label="Open favourites"
        title="Favourites"
        onClick={onOpenFavourites}
      >
        <Star size={18} aria-hidden="true" />
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

const modeIcons = {
  podcast: Podcast,
  radio: Radio,
  tv: Tv
} satisfies Record<TerraMode["controlIcon"], LucideIcon>;
