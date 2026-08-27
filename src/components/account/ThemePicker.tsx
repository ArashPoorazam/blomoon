"use client";

import { Check } from "lucide-react";
import { terraThemes, type TerraTheme, type TerraThemeId } from "@/lib/theme/themes";

type ThemeSwatch = {
  id: "ocean" | "land" | "radio" | "listed" | "selected";
  color: string;
};

type ThemePickerProps = {
  selectedThemeId: TerraThemeId;
  onThemeChange: (themeId: TerraThemeId) => void;
};

export function ThemePicker({ onThemeChange, selectedThemeId }: ThemePickerProps) {
  return (
    <div className="theme-picker creative">
      {terraThemes.map((theme) => (
        <button
          aria-pressed={selectedThemeId === theme.id}
          className={`theme-option ${selectedThemeId === theme.id ? "selected" : ""}`}
          key={theme.id}
          type="button"
          onClick={() => onThemeChange(theme.id)}
        >
          <span className="theme-preview" aria-hidden="true">
            {getThemeSwatches(theme).map((swatch, index) => (
              <span
                className={`theme-swatch swatch-${index + 1}`}
                key={`${theme.id}-${swatch.id}`}
                style={{ background: swatch.color }}
              />
            ))}
          </span>
          <span className="theme-option-main">
            <span>{theme.label}</span>
            <span>{theme.description}</span>
          </span>
          <span className="theme-option-check" aria-hidden="true">
            {selectedThemeId === theme.id ? <Check size={16} /> : null}
          </span>
        </button>
      ))}
    </div>
  );
}

function getThemeSwatches(theme: TerraTheme): ThemeSwatch[] {
  return [
    { id: "ocean", color: theme.globe.ocean },
    { id: "land", color: theme.globe.land },
    { id: "radio", color: theme.globe.markers.tokens.radio },
    { id: "listed", color: theme.globe.markers.listed },
    { id: "selected", color: theme.globe.markers.selected }
  ];
}
