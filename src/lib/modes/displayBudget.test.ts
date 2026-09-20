import { describe, expect, it } from "vitest";
import {
  GLOBE_COUNTRY_POINT_GUARANTEE,
  GLOBE_DISPLAY_BUDGET,
  limitGlobePoints
} from "./displayBudget";
import type { TerraPoint } from "./types";

describe("globe display budget", () => {
  it("uses the full marker budget on every globe profile", () => {
    expect(GLOBE_DISPLAY_BUDGET).toBe(1200);
    expect(GLOBE_COUNTRY_POINT_GUARANTEE).toBe(4);
  });

  it("caps displayed points while preserving selected and active playback points", () => {
    const points = Array.from({ length: 10 }, (_, index) => point(String(index)));
    const limited = limitGlobePoints({
      activePlaybackPoint: points[9],
      budget: 5,
      points,
      selectedPoint: points[8]
    });

    expect(limited).toHaveLength(5);
    expect(limited.map((item) => item.id)).toEqual(["8", "9", "0", "1", "2"]);
  });

  it("does not copy arrays when the point count is inside the budget", () => {
    const points = [point("one")];

    expect(limitGlobePoints({
      activePlaybackPoint: null,
      budget: 5,
      points,
      selectedPoint: null
    })).toBe(points);
  });

  it("preserves required drawer points before filling the marker budget", () => {
    const required = point("listed", "840");
    const limited = limitGlobePoints({
      activePlaybackPoint: null,
      budget: 3,
      points: [point("a", "840"), point("b", "250"), point("c", "276"), required],
      requiredPoints: [required],
      selectedPoint: null
    });

    expect(limited.map((item) => item.id)).toEqual(["listed", "a", "b"]);
  });

  it("fills country guarantees before the remaining default points", () => {
    const points = [
      point("us-1", "840"),
      point("us-2", "840"),
      point("us-3", "840"),
      point("fr-1", "250"),
      point("fr-2", "250"),
      point("de-1", "276"),
      point("de-2", "276")
    ];
    const limited = limitGlobePoints({
      activePlaybackPoint: null,
      budget: 5,
      countryPointGuarantee: 2,
      points,
      selectedPoint: null
    });

    expect(limited.map((item) => item.id)).toEqual(["us-1", "us-2", "fr-1", "fr-2", "de-1", "de-2"]);
  });
  it("does not let lower-ranked required points displace country leaders", () => {
    const points = [point("us-1", "840"), point("us-2", "840"), point("us-3", "840"),
      point("fr-1", "250"), point("fr-1", "250"), point("fr-2", "250")];
    const limited = limitGlobePoints({ points, budget: 4, countryPointGuarantee: 2,
      requiredPoints: [points[2]], activePlaybackPoint: null, selectedPoint: null });
    expect(limited.map(p => p.id)).toEqual(["us-3", "us-1", "us-2", "fr-1", "fr-2"]);
  });

  it("includes selected points outside a small source dataset", () => {
    expect(limitGlobePoints({ points: [point("a")], budget: 5,
      selectedPoint: point("selected"), activePlaybackPoint: point("playing") }).map(p => p.id))
      .toEqual(["selected", "playing", "a"]);
  });

});

function point(id: string, countryCode?: string): TerraPoint {
  return {
    countryCode,
    id,
    latitude: 0,
    longitude: 0,
    modeId: "radio",
    name: `Point ${id}`,
    summary: "Test point"
  };
}
