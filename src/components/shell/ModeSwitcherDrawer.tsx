"use client";

import { ChevronLeft, Podcast, Radio, Tv, type LucideIcon } from "lucide-react";
import type { TerraMode, TerraModeId } from "@/lib/modes/types";

type ModeSwitcherDrawerProps = {
  activeModeId: TerraModeId;
  canGoBack: boolean;
  modes: TerraMode[];
  onBack: () => void;
  onModeSelect: (modeId: TerraModeId) => void;
};

type ModeSwitcherItem = {
  available: boolean;
  description: string;
  icon: TerraMode["controlIcon"];
  id: TerraModeId;
  label: string;
};

const plannedModes = [
  {
    description: "Live radio stations by country and city.",
    icon: "radio",
    id: "radio",
    label: "Radio"
  },
  {
    description: "Podcasts and live audio discovery will be added later.",
    icon: "podcast",
    id: "podcasts",
    label: "Podcasts"
  },
  {
    description: "TV and video modes will open when media contracts are ready.",
    icon: "tv",
    id: "tv",
    label: "TV"
  }
] satisfies Array<Omit<ModeSwitcherItem, "available">>;

export function ModeSwitcherDrawer({ activeModeId, canGoBack, modes, onBack, onModeSelect }: ModeSwitcherDrawerProps) {
  const registeredModes = new Map(modes.map((mode) => [mode.id, mode]));
  const items = plannedModes.map((item) => ({
    ...item,
    available: registeredModes.has(item.id),
    label: registeredModes.get(item.id)?.label ?? item.label
  }));

  return (
    <div className="mode-switcher-view" aria-label="Change mode">
      <div className="drawer-header">
        <div>
          <h2 className="drawer-title">Change mode</h2>
          <p className="drawer-subtitle">More live entertainment modes are planned.</p>
        </div>
        {canGoBack ? (
          <button className="icon-button" type="button" aria-label="Back to list" onClick={onBack}>
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="mode-switcher-list">
        {items.map((item) => {
          const Icon = modeIcons[item.icon];
          const active = item.id === activeModeId;

          return (
            <button
              aria-current={active ? "page" : undefined}
              className={`mode-switcher-option ${active ? "active" : ""}`}
              disabled={!item.available}
              key={item.id}
              type="button"
              onClick={() => onModeSelect(item.id)}
            >
              <span className="mode-switcher-icon">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="mode-switcher-copy">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </span>
              <span className="mode-switcher-status">{item.available ? active ? "Active" : "Open" : "Soon"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const modeIcons = {
  podcast: Podcast,
  radio: Radio,
  tv: Tv
} satisfies Record<TerraMode["controlIcon"], LucideIcon>;
