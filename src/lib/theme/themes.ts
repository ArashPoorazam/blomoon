import { defaultGlobeTheme, type GlobeTheme, type MarkerColorToken } from "./globe";

export type TerraThemeId = "night" | "atlas";

export type TerraTheme = {
  id: TerraThemeId;
  label: string;
  globe: GlobeTheme;
};

export const terraThemes = [
  {
    id: "night",
    label: "Night",
    globe: defaultGlobeTheme
  },
  {
    id: "atlas",
    label: "Atlas",
    globe: {
      ocean: "#102a43",
      land: "#d7c79a",
      border: "#27364a",
      borderLineWidth: 1.15,
      borderOpacity: 0.66,
      countryHighlight: "#2f80ed",
      countryHighlightOpacity: 0.28,
      selectedCountryOutlineOpacity: 0.98,
      selectedCountryOutlineWidth: 2.1,
      markers: {
        defaultSingle: "#f7f4ea",
        selected: "#e65a34",
        selectedRing: "#ffffff",
        tokens: {
          radio: "#c73272"
        },
        prominence: [
          "#3178c6",
          "#287c8e",
          "#388659",
          "#8a8f2a",
          "#c47f21",
          "#c2552d",
          "#a5344a"
        ]
      }
    }
  }
] as const satisfies readonly TerraTheme[];

export const defaultTheme = terraThemes[0];

export function getTerraTheme(id: TerraThemeId) {
  return terraThemes.find((theme) => theme.id === id) ?? defaultTheme;
}

export function getNextTerraTheme(currentId: TerraThemeId) {
  const currentIndex = terraThemes.findIndex((theme) => theme.id === currentId);
  return terraThemes[(currentIndex + 1) % terraThemes.length] ?? defaultTheme;
}

export function resolveMarkerColor(theme: TerraTheme, token?: MarkerColorToken) {
  return token ? theme.globe.markers.tokens[token] : undefined;
}
