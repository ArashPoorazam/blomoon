import { describe, expect, it } from "vitest";
import { favouriteInputSchema, themeInputSchema } from "./validation";

describe("user API validation", () => {
  it("accepts known theme ids", () => {
    expect(themeInputSchema.safeParse({ themeId: "night" }).success).toBe(true);
    expect(themeInputSchema.safeParse({ themeId: "atlas" }).success).toBe(true);
  });

  it("rejects unknown theme ids", () => {
    expect(themeInputSchema.safeParse({ themeId: "purple" }).success).toBe(false);
  });

  it("requires bounded favourite refs", () => {
    expect(favouriteInputSchema.safeParse({ modeId: "radio", pointId: "abc" }).success).toBe(true);
    expect(favouriteInputSchema.safeParse({ modeId: "", pointId: "abc" }).success).toBe(false);
    expect(favouriteInputSchema.safeParse({ modeId: "radio", pointId: "" }).success).toBe(false);
  });
});
