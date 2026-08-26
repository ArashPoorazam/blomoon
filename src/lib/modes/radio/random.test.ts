import { describe, expect, it } from "vitest";
import { getRandomCatalogRecord, getRandomOffset } from "./randomSelection";
import type { RadioStationRecord } from "./types";

describe("radio random selection", () => {
  it("keeps random provider offsets inside the available range", () => {
    expect(getRandomOffset(10, () => 0)).toBe(0);
    expect(getRandomOffset(10, () => 0.999)).toBe(9);
    expect(getRandomOffset(10, () => 1)).toBe(9);
  });

  it("skips an excluded current station when alternatives exist", () => {
    const record = getRandomCatalogRecord([
      station("current"),
      station("next")
    ], {
      excludePointId: "current",
      random: () => 0
    });

    expect(record?.point.id).toBe("next");
  });

  it("falls back to the excluded station only when no alternatives exist", () => {
    const record = getRandomCatalogRecord([station("current")], {
      excludePointId: "current"
    });

    expect(record?.point.id).toBe("current");
  });

  it("returns null for an empty fallback catalog", () => {
    expect(getRandomCatalogRecord([])).toBeNull();
  });
});

function station(id: string): RadioStationRecord {
  const point = {
    countryCode: "840",
    id,
    latitude: 0,
    longitude: 0,
    modeId: "radio",
    name: `Station ${id}`,
    summary: "Test station"
  } satisfies RadioStationRecord["point"];

  return {
    clickCount: 0,
    detail: {
      ...point,
      fields: []
    },
    point,
    searchText: point.name.toLowerCase(),
    streamUrl: "https://example.com/radio.mp3",
    votes: 0
  };
}
