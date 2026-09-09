import { describe, expect, it } from "vitest";
import { absoluteShareLink, folderSharePath, safeLocalReturnPath, stationSharePath } from "./links";

describe("share links", () => {
  it("builds encoded canonical station and folder links", () => {
    expect(stationSharePath("radio", "station/1")).toBe("/share/stations/radio/station%2F1");
    expect(folderSharePath("token_1")).toBe("/share/folders/token_1");
    expect(absoluteShareLink("/share/folders/token_1", "https://blomoon.example")).toBe("https://blomoon.example/share/folders/token_1");
  });

  it("rejects external and protocol-relative return destinations", () => {
    expect(safeLocalReturnPath("/share/folders/token")).toBe("/share/folders/token");
    expect(safeLocalReturnPath("//evil.example/path")).toBe("/");
    expect(safeLocalReturnPath("https://evil.example/path")).toBe("/");
    expect(safeLocalReturnPath("/\\evil.example")).toBe("/");
  });
});
