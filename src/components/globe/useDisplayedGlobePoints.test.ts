import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultTheme } from "@/lib/theme/themes";
import { radioMode } from "@/lib/modes/radio/mode";
import type { TerraPoint } from "@/lib/modes/types";
import { useDisplayedGlobePoints } from "./useDisplayedGlobePoints";

const point = (id: string): TerraPoint => ({ id, modeId: "radio", name: id, summary: "test", latitude: 1, longitude: 2 });
function displayed(listedPoints: TerraPoint[], showListedOnGlobe = true) {
  let result: ReturnType<typeof useDisplayedGlobePoints> | undefined;
  function Harness() {
    result = useDisplayedGlobePoints({ activeMode: radioMode, activeTheme: defaultTheme,
      activePlaybackPoint: point("unrelated-playing"), modeSelectedPoint: point("unrelated-selected"),
      modeGlobePoints: [point("default")], listedPoints, showListedOnGlobe,
      globeProfile: { countryPointGuarantee: 0, markerBudget: 1, dpr: [1, 1], hoverEnabled: true,
        motionEnabled: true, profile: "desktop" } });
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  return result!;
}

describe("listed globe points", () => {
  it("shows exactly the loaded list, even above the default marker budget", () => {
    const result = displayed([point("folder-a"), point("folder-b"), point("folder-a")]);
    expect(result.points.map((item) => item.id)).toEqual(["folder-a", "folder-b"]);
    expect(result.selectedPoint).toBeNull();
    expect(result.activePlaybackPoint).toBeNull();
  });
  it("adds loaded pages and never substitutes another list for an empty folder", () => {
    expect(displayed([]).points).toEqual([]);
    expect(displayed([point("suggestion-1"), point("suggestion-2")]).points).toHaveLength(2);
  });
  it("keeps default-mode selection and playback in the separate highlight layer", () => {
    const result = displayed([], false);
    expect(result.points.map((item) => item.id)).toEqual(["default"]);
    expect(result.selectedPoint?.id).toBe("unrelated-selected");
    expect(result.activePlaybackPoint?.id).toBe("unrelated-playing");
  });
});

for (const profile of ["desktop", "mobile"] as const) {
  it(`preserves all country leaders beneath a loaded list on ${profile}`, () => {
    const leaders = ["840", "250", "276"].flatMap(countryCode =>
      Array.from({ length: 4 }, (_, i) => ({ ...point(`${countryCode}-${i}`), countryCode })));
    const listed = { ...point("lower-ranked"), countryCode: "840" };
    let displayedPoints: TerraPoint[] = [];
    function Harness() {
      displayedPoints = useDisplayedGlobePoints({ activeMode: radioMode, activeTheme: defaultTheme,
        activePlaybackPoint: null, modeSelectedPoint: null, modeGlobePoints: leaders,
        listedPoints: [listed], showListedOnGlobe: false,
        globeProfile: { countryPointGuarantee: 4, markerBudget: 10, dpr: [1, 1],
          hoverEnabled: profile === "desktop", motionEnabled: true, profile } }).points;
      return null;
    }
    renderToStaticMarkup(createElement(Harness));
    expect(displayedPoints).toHaveLength(13);
    expect(displayedPoints).toEqual(expect.arrayContaining(leaders));
  });
}
