"use client";

import { Earth, Radio, Star } from "lucide-react";
import type { MouseEvent } from "react";
import { AccountModalShell } from "./account/AccountModalShell";

type ShellControlRailProps = {
  earthSpinEnabled: boolean;
  onOpenFavourites: () => void;
  onOpenModeNotice: () => void;
  onToggleEarthSpin: (event: MouseEvent<HTMLButtonElement>) => void;
};

type ModeComingSoonModalProps = {
  onClose: () => void;
};

export function ShellControlRail({
  earthSpinEnabled,
  onOpenFavourites,
  onOpenModeNotice,
  onToggleEarthSpin
}: ShellControlRailProps) {
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
        type="button"
        aria-label={earthSpinEnabled ? "Stop globe spin" : "Start globe spin"}
        aria-pressed={earthSpinEnabled}
        title="Globe spin"
        onClick={onToggleEarthSpin}
      >
        <Earth size={18} aria-hidden="true" />
      </button>
      <button
        className="shell-square-control active"
        type="button"
        aria-label="Radio mode. Podcast and TV modes coming soon"
        title="Radio"
        onClick={onOpenModeNotice}
      >
        <Radio size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}

export function ModeComingSoonModal({ onClose }: ModeComingSoonModalProps) {
  return (
    <AccountModalShell
      description="Podcast and TV discovery are planned for Blomoon. Radio is live now while the next media modes are being prepared."
      kicker="Modes"
      title="More modes coming soon"
      onClose={onClose}
    >
      <div className="mode-coming-soon">
        <div className="mode-coming-soon-icon" aria-hidden="true">
          <Radio size={22} />
        </div>
        <div>
          <strong>Radio is available today.</strong>
          <span>Podcast and TV modes will be added soon. Stay tuned.</span>
        </div>
      </div>
    </AccountModalShell>
  );
}
