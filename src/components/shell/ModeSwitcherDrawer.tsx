"use client";

import { Check } from "lucide-react";
import type { TerraMode, TerraModeId } from "@/lib/modes/types";
import { DrawerHeader } from "../drawer/DrawerHeader";
import { modeIcons } from "./modeIcons";

type ModeSwitcherDrawerProps = {
  activeModeId: TerraModeId;
  modes: TerraMode[];
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
    description: "Stories and conversations from around the world.",
    icon: "podcast",
    id: "podcasts",
    label: "Podcasts"
  },
  {
    description: "Discover live television from around the world.",
    icon: "tv",
    id: "tv",
    label: "TV"
  }
] satisfies Array<Omit<ModeSwitcherItem, "available">>;

export function ModeSwitcherDrawer({ activeModeId, modes, onModeSelect }: ModeSwitcherDrawerProps) {
  const registeredModes = new Map(modes.map((mode) => [mode.id, mode]));
  const items = plannedModes.map((item) => ({
    ...item,
    available: registeredModes.has(item.id),
    label: registeredModes.get(item.id)?.label ?? item.label
  }));

  return (
    <div className="mode-switcher-view" aria-label="Change mode">
      <DrawerHeader
        title="Change mode"
        subtitle="Choose how you explore the world."
      />
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
              <span className="mode-switcher-status">{active ? <Check size={13} aria-hidden="true" /> : null}{item.available ? active ? "Active" : "Open" : "Soon"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
