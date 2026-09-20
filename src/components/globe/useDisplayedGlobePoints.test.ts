import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultTheme, terraThemes, type TerraTheme } from "@/lib/theme/themes";
import { radioMode } from "@/lib/modes/radio/mode";
import type { TerraPoint } from "@/lib/modes/types";
import { useDisplayedGlobePoints } from "./useDisplayedGlobePoints";

const point = (id: string): TerraPoint => ({ id, modeId: "radio", name: id, summary: "test", latitude: 1, longitude: 2 });
function displayed(listedPoints: TerraPoint[], showListedOnGlobe = true, modeGlobePoints = [point("default")], activeTheme: TerraTheme = defaultTheme) {
  let result: ReturnType<typeof useDisplayedGlobePoints> | undefined;
  function Harness() {
    result = useDisplayedGlobePoints({ activeMode: radioMode, activeTheme,
      activePlaybackPoint: point("playing"), modeSelectedPoint: point("selected"),
      modeGlobePoints, listedPoints, showListedOnGlobe });
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  return result!;
}

describe("persistent globe coverage (shared by desktop and mobile)", () => {
  it("shows only the deduplicated drawer list in yellow", () => {
    const result = displayed([point("folder-a"), point("default"), point("folder-a")]);
    expect(result.points.map(p => p.id)).toEqual(["folder-a", "default"]);
    expect(result.markerColorMode).toBe("single");
    expect(result.markerColor).toBe("#facc15");
  });
  it("retains defaults for empty lists, search changes, pagination and toggle off", () => {
    for (const list of [[], [point("search")], [point("search"), point("next-page")]]) {
      expect(displayed(list).points).toEqual(list);
      expect(displayed(list, false).points).toEqual([point("default")]);
    }
  });
  it("filters unrelated highlights without changing playback state", () => {
    expect(displayed([]).selectedPoint).toBeNull();
    expect(displayed([]).activePlaybackPoint).toBeNull();
    expect(displayed([point("selected"), point("playing")]).selectedPoint?.id).toBe("selected");
    expect(displayed([point("selected"), point("playing")]).activePlaybackPoint?.id).toBe("playing");
    expect(displayed([], false).selectedPoint?.id).toBe("selected");
    expect(displayed([], false).activePlaybackPoint?.id).toBe("playing");
  });
  it("uses yellow in every theme", () => {
    for (const theme of terraThemes) expect(displayed([point("listed")], true, [], theme).markerColor).toBe("#facc15");
  });
  it("never recaps the baseline when country markers or listed points are added", () => {
    const baseline = Array.from({ length: 1204 }, (_, i) => point(String(i)));
    for (const country of [[], [point("fr")], [point("de")]]) {
      const result = displayed([point("listed")], false, [...baseline, ...country]);
      expect(result.points).toEqual([...baseline, ...country]);
    }
  });
});
