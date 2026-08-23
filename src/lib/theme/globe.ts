export type MarkerColorMode = "prominence" | "single";
export type MarkerColorToken = "radio";

export type GlobeTheme = {
  ocean: string;
  land: string;
  border: string;
  countryHighlight: string;
  markers: {
    defaultSingle: string;
    selected: string;
    selectedRing: string;
    prominence: readonly string[];
    tokens: Record<MarkerColorToken, string>;
  };
};

export const defaultGlobeTheme = {
  ocean: "#050509",
  land: "#3b4261",
  border: "#c0caf5",
  countryHighlight: "#7aa2f7",
  markers: {
    defaultSingle: "#ffffff",
    selected: "#ff9e64",
    selectedRing: "#ffffff",
    tokens: {
      radio: "#ff4499"
    },
    prominence: [
      "#7aa2f7",
      "#929ff7",
      "#aa9cf7",
      "#bb9af7",
      "#cf91ce",
      "#e687ae",
      "#f7768e"
    ]
  }
} as const satisfies GlobeTheme;
