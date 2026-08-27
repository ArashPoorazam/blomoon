import { defaultGlobeTheme, type GlobeTheme, type MarkerColorToken } from "./globe";
import type { TerraThemeId } from "./ids";
export { isTerraThemeId, terraThemeIdList, terraThemeIds, type TerraThemeId } from "./ids";

export type TerraTheme = {
  id: TerraThemeId;
  label: string;
  description: string;
  globe: GlobeTheme;
};

export const terraThemes = [
  {
    id: "night",
    label: "Tokyo Night",
    description: "Neon night globe with cool blue controls.",
    globe: defaultGlobeTheme
  },
  {
    id: "atlas",
    label: "Atlas",
    description: "Clear daylight globe with soft sage land and mineral teal stations.",
    globe: {
      ocean: "#d9eef0",
      land: "#c5d2b8",
      border: "#3f6974",
      borderLineWidth: 1.15,
      borderOpacity: 0.5,
      countryHighlight: "#0f766e",
      countryHighlightOpacity: 0.2,
      selectedCountryOutlineOpacity: 0.98,
      selectedCountryOutlineWidth: 2.1,
      markers: {
        defaultSingle: "#0f766e",
        listed: "#127f7a",
        selected: "#b65f3a",
        selectedRing: "#f8fbf7",
        tokens: {
          radio: "#0e7490"
        },
        prominence: [
          "#5f8fb6",
          "#3f9aa7",
          "#127f7a",
          "#4f9472",
          "#8da24f",
          "#b07a3b",
          "#b65f3a"
        ]
      }
    }
  },
  {
    id: "retro-82",
    label: "Retro 82",
    description: "Deep navy, warm amber, and teal broadcast glow.",
    globe: {
      ocean: "#00172e",
      land: "#134e5a",
      border: "#f6dcac",
      borderLineWidth: 1.15,
      borderOpacity: 0.48,
      countryHighlight: "#faa968",
      countryHighlightOpacity: 0.28,
      selectedCountryOutlineOpacity: 0.98,
      selectedCountryOutlineWidth: 2.1,
      markers: {
        defaultSingle: "#f6dcac",
        listed: "#35a2a7",
        selected: "#f85525",
        selectedRing: "#f6dcac",
        tokens: {
          radio: "#faa968"
        },
        prominence: [
          "#028391",
          "#35a2a7",
          "#65a5a1",
          "#8cbfb8",
          "#e97b3c",
          "#faa968",
          "#f85525"
        ]
      }
    }
  },
  {
    id: "hackerman",
    label: "Hacker Man",
    description: "Dark terminal surfaces with electric green signal.",
    globe: {
      ocean: "#0B0C16",
      land: "#1f253a",
      border: "#82FB9C",
      borderLineWidth: 1.15,
      borderOpacity: 0.48,
      countryHighlight: "#82FB9C",
      countryHighlightOpacity: 0.26,
      selectedCountryOutlineOpacity: 0.98,
      selectedCountryOutlineWidth: 2.1,
      markers: {
        defaultSingle: "#ddf7ff",
        listed: "#4fe88f",
        selected: "#d1fffe",
        selectedRing: "#82FB9C",
        tokens: {
          radio: "#82FB9C"
        },
        prominence: [
          "#287b51",
          "#4fe88f",
          "#50f872",
          "#82FB9C",
          "#9cf7c2",
          "#7cf8f7",
          "#d1fffe"
        ]
      }
    }
  },
  {
    id: "catppuccin",
    label: "Catppuccin",
    description: "Cozy Mocha surfaces with lavender and mauve station glow.",
    globe: {
      ocean: "#11111b",
      land: "#313244",
      border: "#cdd6f4",
      borderLineWidth: 1.15,
      borderOpacity: 0.5,
      countryHighlight: "#cba6f7",
      countryHighlightOpacity: 0.3,
      selectedCountryOutlineOpacity: 0.98,
      selectedCountryOutlineWidth: 2.1,
      markers: {
        defaultSingle: "#cba6f7",
        listed: "#b4befe",
        selected: "#f5c2e7",
        selectedRing: "#b4befe",
        tokens: {
          radio: "#cba6f7"
        },
        prominence: [
          "#89b4fa",
          "#b4befe",
          "#b4befe",
          "#cba6f7",
          "#cba6f7",
          "#f5c2e7",
          "#f5c2e7"
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
