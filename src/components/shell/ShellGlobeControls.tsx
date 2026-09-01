"use client";

import { Earth, MapPin } from "lucide-react";
import type { MouseEvent } from "react";

type ShellGlobeControlsProps = {
  earthSpinDisabled: boolean;
  earthSpinEnabled: boolean;
  showListedOnGlobe: boolean;
  onToggleEarthSpin: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggleShowListedOnGlobe: () => void;
};

export function ShellGlobeControls({
  earthSpinDisabled,
  earthSpinEnabled,
  onToggleEarthSpin,
  onToggleShowListedOnGlobe,
  showListedOnGlobe
}: ShellGlobeControlsProps) {
  return (
    <nav className="shell-globe-controls" aria-label="Globe display controls">
      <button
        aria-label={showListedOnGlobe ? "Show default globe points" : "Display listed points on globe"}
        aria-pressed={showListedOnGlobe}
        className={`shell-square-control ${showListedOnGlobe ? "active" : ""}`}
        title="Display listed points on globe"
        type="button"
        onClick={onToggleShowListedOnGlobe}
      >
        <MapPin size={18} aria-hidden="true" fill={showListedOnGlobe ? "currentColor" : "none"} />
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
    </nav>
  );
}
