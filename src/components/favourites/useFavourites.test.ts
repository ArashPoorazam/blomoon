import { describe, expect, it } from "vitest";
import { toFavouriteKey } from "@/lib/persistence/favouriteKeys";

describe("toFavouriteKey", () => {
  it("keeps favourite state mode-neutral", () => {
    expect(toFavouriteKey({ modeId: "radio", pointId: "station-1" })).toBe("radio:station-1");
    expect(toFavouriteKey({ modeId: "podcasts", pointId: "station-1" })).toBe("podcasts:station-1");
  });
});
