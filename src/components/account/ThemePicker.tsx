"use client";

import { Check } from "lucide-react";
import { terraThemes, type TerraTheme, type TerraThemeId } from "@/lib/theme/themes";

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
            {getThemeSwatches(theme).map((color, index) => (
              <span className={`theme-swatch swatch-${index + 1}`} key={`${theme.id}-${color}`} style={{ background: color }} />
            ))}
          </span>
          <span className="theme-option-main">
            <span>{theme.label}</span>
            <span>{theme.id === "night" ? "Neon night globe with cool blue controls." : "Warm atlas land tones with crisp blue interface accents."}</span>
          </span>
          <span className="theme-option-check" aria-hidden="true">
            {selectedThemeId === theme.id ? <Check size={16} /> : null}
          </span>
        </button>
      ))}
    </div>
  );
}

function getThemeSwatches(theme: TerraTheme) {
  return [
    theme.globe.ocean,
    theme.globe.land,
    theme.globe.markers.tokens.radio,
    theme.globe.markers.listed,
    theme.globe.markers.selected
  ];
}
