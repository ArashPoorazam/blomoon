import { describe, expect, it } from "vitest";
import { terraThemeIds } from "@/lib/theme/ids";
import { favouriteFolderShareInputSchema, favouriteFolderInputSchema, favouriteFolderItemInputSchema, favouriteShareTokenSchema, themeInputSchema } from "./validation";

describe("user API validation", () => {
  it("accepts only explicit boolean share rotation options", () => {
    expect(favouriteFolderShareInputSchema.safeParse({}).success).toBe(true);
    expect(favouriteFolderShareInputSchema.safeParse({ rotate: true }).success).toBe(true);
    for (const input of [null, [], { rotate: "true" }, { rotate: true, userId: "another-owner" }]) {
      expect(favouriteFolderShareInputSchema.safeParse(input).success).toBe(false);
    }
  });
  it("accepts known theme ids", () => {
    for (const themeId of terraThemeIds) {
      expect(themeInputSchema.safeParse({ themeId }).success).toBe(true);
    }
  });

  it("rejects unknown theme ids", () => {
    expect(themeInputSchema.safeParse({ themeId: "purple" }).success).toBe(false);
  });

  it("requires bounded favourite refs", () => {
    expect(favouriteFolderItemInputSchema.safeParse({ modeId: "radio", pointId: "abc" }).success).toBe(true);
    expect(favouriteFolderItemInputSchema.safeParse({ modeId: "", pointId: "abc" }).success).toBe(false);
    expect(favouriteFolderItemInputSchema.safeParse({ modeId: "radio", pointId: "" }).success).toBe(false);
  });

  it("requires bounded favourite folder fields", () => {
    expect(favouriteFolderInputSchema.safeParse({ name: "Morning stations", description: "Drive-time picks" }).success).toBe(true);
    expect(favouriteFolderInputSchema.safeParse({ name: " " }).success).toBe(false);
    expect(favouriteFolderInputSchema.safeParse({ name: "a".repeat(81) }).success).toBe(false);
    expect(favouriteFolderInputSchema.safeParse({ name: "Morning", description: "a".repeat(241) }).success).toBe(false);
  });

  it("accepts only bounded URL-safe share tokens", () => {
    expect(favouriteShareTokenSchema.safeParse("a".repeat(32)).success).toBe(true);
    expect(favouriteShareTokenSchema.safeParse("short").success).toBe(false);
    expect(favouriteShareTokenSchema.safeParse("a".repeat(31) + "/").success).toBe(false);
  });
});
