import { describe, expect, it } from "vitest";
import { resolveImportedFolderName } from "./favouriteFolderNames";

describe("imported favourite folder names", () => {
  it("numbers case-insensitive conflicts", () => {
    expect(resolveImportedFolderName("Mix", ["mix", "Mix (2)"])).toBe("Mix (3)");
  });

  it("keeps numbered names within 80 characters", () => {
    const result = resolveImportedFolderName("a".repeat(80), ["a".repeat(80)]);
    expect(result).toHaveLength(80);
    expect(result.endsWith(" (2)")).toBe(true);
  });
});
