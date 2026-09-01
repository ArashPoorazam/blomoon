import { describe, expect, it } from "vitest";
import { terraThemeIds } from "@/lib/theme/ids";
import { favouriteListInputSchema, favouriteListItemInputSchema, themeInputSchema } from "./validation";

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
    expect(favouriteListItemInputSchema.safeParse({ modeId: "radio", pointId: "abc" }).success).toBe(true);
    expect(favouriteListItemInputSchema.safeParse({ modeId: "", pointId: "abc" }).success).toBe(false);
    expect(favouriteListItemInputSchema.safeParse({ modeId: "radio", pointId: "" }).success).toBe(false);
  });

  it("requires bounded favourite list names", () => {
    expect(favouriteListInputSchema.safeParse({ name: "Morning stations" }).success).toBe(true);
    expect(favouriteListInputSchema.safeParse({ name: " " }).success).toBe(false);
    expect(favouriteListInputSchema.safeParse({ name: "a".repeat(81) }).success).toBe(false);
  });
});
