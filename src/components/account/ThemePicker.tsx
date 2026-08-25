"use client";

import { Check } from "lucide-react";
import { terraThemes, type TerraTheme, type TerraThemeId } from "@/lib/theme/themes";

type ThemePickerProps = {
  selectedThemeId: TerraThemeId;
  onThemeChange: (themeId: TerraThemeId) => void;
};

export function ThemePicker({ onThemeChange, selectedThemeId }: ThemePickerProps) {
  return (
    <div className="theme-picker">
      {terraThemes.map((theme) => (
        <button
          aria-pressed={selectedThemeId === theme.id}
          className={`theme-option ${selectedThemeId === theme.id ? "selected" : ""}`}
          key={theme.id}
          type="button"
          onClick={() => onThemeChange(theme.id)}
        >
          <span className="theme-option-main">
            <span>{theme.label}</span>
            <span className="theme-swatches" aria-hidden="true">
              {getThemeSwatches(theme).map((color) => (
                <span className="theme-swatch" key={color} style={{ background: color }} />
              ))}
            </span>
          </span>
          {selectedThemeId === theme.id ? <Check size={16} aria-hidden="true" /> : null}
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
