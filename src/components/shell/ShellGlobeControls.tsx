"use client";

import { Crosshair, Earth, MapPin } from "lucide-react";
import type { MouseEvent } from "react";

type ShellGlobeControlsProps = {
  placement?: "mobile" | "drawer";
  crosshairEnabled?: boolean;
  onToggleCrosshair?: () => void;
  listedPointsDisabled: boolean;
  earthSpinDisabled: boolean;
  earthSpinEnabled: boolean;
  showListedOnGlobe: boolean;
  onToggleEarthSpin: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggleShowListedOnGlobe: () => void;
};

export function ShellGlobeControls({
  placement = "mobile",
  crosshairEnabled,
  onToggleCrosshair,
  listedPointsDisabled,
  earthSpinDisabled,
  earthSpinEnabled,
  onToggleEarthSpin,
  onToggleShowListedOnGlobe,
  showListedOnGlobe
}: ShellGlobeControlsProps) {
  return (
    <nav className={`shell-globe-controls shell-globe-controls-${placement}`} aria-label="Globe display controls">
      <button
        disabled={listedPointsDisabled}
        aria-label={showListedOnGlobe ? "Hide additional listed points" : "Add listed points to globe"}
        aria-pressed={showListedOnGlobe}
        className={`shell-square-control ${showListedOnGlobe ? "active" : ""}`}
        title={showListedOnGlobe ? "Hide additional listed points" : "Add listed points to globe"}
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
      {onToggleCrosshair ? <button className={`shell-square-control ${crosshairEnabled ? "active" : ""}`} type="button"
        aria-label={crosshairEnabled ? "Turn crosshair off" : "Turn crosshair on"}
        aria-pressed={crosshairEnabled} title="Crosshair" onClick={onToggleCrosshair}>
        <Crosshair size={18} aria-hidden="true" />
      </button> : null}
    </nav>
  );
}
