import { describe, expect, it } from "vitest";
import { createCountryStationCountIndex } from "./searchPages";

describe("radio search pages", () => {
  it("coalesces duplicate provider country count rows by canonical alpha code", () => {
    const counts = createCountryStationCountIndex([
      { name: "US", stationcount: 7120 },
      { name: "us", stationcount: 1 },
      { iso_3166_1: "de", name: "Germany", stationcount: "680" },
      { iso_3166_1: "", name: "GB", stationcount: "320" },
      { name: "The United States Of America", stationcount: 9999 },
      { name: "ZZZ", stationcount: 10 },
      { name: "FR", stationcount: "not-a-number" }
    ]);

    expect(counts.get("US")).toBe(7120);
    expect(counts.get("DE")).toBe(680);
    expect(counts.get("GB")).toBe(320);
    expect(counts.has("ZZZ")).toBe(false);
    expect(counts.has("FR")).toBe(false);
  });
});
