import { describe, expect, it } from "vitest";
import { terraThemeIds } from "@/lib/theme/ids";
import { favouriteInputSchema, themeInputSchema } from "./validation";

describe("user API validation", () => {
  it("accepts known theme ids", () => {
    for (const themeId of terraThemeIds) {
      expect(themeInputSchema.safeParse({ themeId }).success).toBe(true);
    }
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
