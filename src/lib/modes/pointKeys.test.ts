import { describe, expect, it } from "vitest";
import { getPointKey, getPointRefKey } from "./pointKeys";

describe("point keys", () => {
  it("uses the same mode-neutral identity for points and persisted references", () => {
    expect(getPointKey({ id: "station-1", modeId: "radio" })).toBe("radio:station-1");
    expect(getPointRefKey({ modeId: "radio", pointId: "station-1" })).toBe("radio:station-1");
    expect(getPointRefKey({ modeId: "podcasts", pointId: "station-1" })).toBe("podcasts:station-1");
  });
});
