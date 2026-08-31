import { describe, expect, it } from "vitest";
import { GLOBE_DISPLAY_BUDGET, limitGlobePoints } from "./displayBudget";
import type { TerraPoint } from "./types";

describe("globe display budget", () => {
  it("uses a lower mobile marker budget than desktop", () => {
    expect(GLOBE_DISPLAY_BUDGET.mobile).toBeLessThan(GLOBE_DISPLAY_BUDGET.desktop);
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
});

function point(id: string): TerraPoint {
  return {
    id,
    latitude: 0,
    longitude: 0,
    modeId: "radio",
    name: `Point ${id}`,
    summary: "Test point"
  };
}
