export type MarkerColorMode = "severity" | "single";

export const globeTheme = {
  ocean: "#050509",
  land: "#3b4261",
  border: "#c0caf5",
  markers: {
    defaultSingle: "#ffffff",
    radio: "#ff4499",
    selected: "#ff9e64",
    selectedRing: "#ffffff",
    severity: [
      "#7aa2f7",
      "#929ff7",
      "#aa9cf7",
      "#bb9af7",
      "#cf91ce",
      "#e687ae",
      "#f7768e"
    ]
  }
} as const;
