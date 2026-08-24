export type MarkerColorMode = "prominence" | "single";
export type MarkerColorToken = "radio";
type MarkerColorPoint = {
  prominence?: number;
};

export type GlobeTheme = {
  ocean: string;
  land: string;
  border: string;
  borderLineWidth: number;
  borderOpacity: number;
  countryHighlight: string;
  countryHighlightOpacity: number;
  selectedCountryOutlineOpacity: number;
  selectedCountryOutlineWidth: number;
  markers: {
    defaultSingle: string;
    listed: string;
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
  borderLineWidth: 1.15,
  borderOpacity: 0.6,
  countryHighlight: "#7aa2f7",
  countryHighlightOpacity: 0.32,
  selectedCountryOutlineOpacity: 0.95,
  selectedCountryOutlineWidth: 2.1,
  markers: {
    defaultSingle: "#ffffff",
    listed: "#4ade80",
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

export function resolvePointMarkerColor(
  point: MarkerColorPoint,
  markerColorMode: MarkerColorMode,
  singleColor: string,
  theme: GlobeTheme
) {
  if (markerColorMode === "single") {
    return singleColor;
  }

  const value = Math.max(0, Math.min(1, point.prominence ?? 0.3));
  const bucketIndex = Math.round(value * (theme.markers.prominence.length - 1));
  return theme.markers.prominence[bucketIndex] ?? singleColor;
}
