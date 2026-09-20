import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultTheme } from "@/lib/theme/themes";
import { radioMode } from "@/lib/modes/radio/mode";
import type { TerraPoint } from "@/lib/modes/types";
import { useDisplayedGlobePoints } from "./useDisplayedGlobePoints";

const point = (id: string): TerraPoint => ({ id, modeId: "radio", name: id, summary: "test", latitude: 1, longitude: 2 });
function displayed(listedPoints: TerraPoint[], showListedOnGlobe = true, modeGlobePoints = [point("default")]) {
  let result: ReturnType<typeof useDisplayedGlobePoints> | undefined;
  function Harness() {
    result = useDisplayedGlobePoints({ activeMode: radioMode, activeTheme: defaultTheme,
      activePlaybackPoint: point("playing"), modeSelectedPoint: point("selected"),
      modeGlobePoints, listedPoints, showListedOnGlobe });
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  return result!;
}

describe("persistent globe coverage (shared by desktop and mobile)", () => {
  it("adds listed points and deduplicates overlaps", () => {
    const result = displayed([point("folder-a"), point("default"), point("folder-a")]);
    expect(result.points.map(p => p.id)).toEqual(["default", "folder-a"]);
    expect(result.markerColorMode).toBe(radioMode.markerColorMode);
    expect(result.markerColor).toBe(displayed([], false).markerColor);
  });
  it("retains defaults for empty lists, search changes, pagination and toggle off", () => {
    for (const list of [[], [point("search")], [point("search"), point("next-page")]]) {
      expect(displayed(list).points).toEqual([point("default"), ...list]);
      expect(displayed(list, false).points).toEqual([point("default")]);
    }
  });
  it("preserves selection and playback in both toggle states", () => {
    for (const enabled of [true, false]) {
      expect(displayed([], enabled).selectedPoint?.id).toBe("selected");
      expect(displayed([], enabled).activePlaybackPoint?.id).toBe("playing");
    }
  });
  it("never recaps the baseline when country markers or listed points are added", () => {
    const baseline = Array.from({ length: 1204 }, (_, i) => point(String(i)));
    for (const country of [[], [point("fr")], [point("de")]]) {
      const result = displayed([point("listed")], true, [...baseline, ...country]);
      expect(result.points).toEqual([...baseline, ...country, point("listed")]);
    }
  });
});
