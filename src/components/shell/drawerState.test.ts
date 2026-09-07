import { describe, expect, it } from "vitest";
import {
  canGoBackFromDrawerStack,
  createDrawerStack,
  getCurrentDrawerView,
  isAccountDrawerView,
  openDrawerStackView,
  popDrawerStack,
  resolveDrawerMobilePosition
} from "./drawerState";

describe("shell drawer state", () => {
  it("identifies account-owned drawer views", () => {
    expect(isAccountDrawerView("account")).toBe(true);
    expect(isAccountDrawerView("account-info")).toBe(true);
    expect(isAccountDrawerView("themes")).toBe(true);
    expect(isAccountDrawerView("contact")).toBe(true);
    expect(isAccountDrawerView("favourites")).toBe(false);
    expect(isAccountDrawerView("main")).toBe(false);
  });

  it("creates root-based drawer branches", () => {
    expect(createDrawerStack("main")).toEqual([{ kind: "main" }]);
    expect(createDrawerStack("favourites")).toEqual([{ kind: "main" }, { kind: "favourites" }]);
    expect(createDrawerStack("themes")).toEqual([{ kind: "main" }, { kind: "account" }, { kind: "themes" }]);
  });

  it("pushes point detail from the current drawer branch", () => {
    const detail = { kind: "point-detail" as const, modeId: "radio", pointId: "station-1" };
    expect(openDrawerStackView(createDrawerStack("main"), detail)).toEqual([{ kind: "main" }, detail]);
    const folderStack = openDrawerStackView(createDrawerStack("favourites"), { kind: "favourite-folder", folderId: "folder-1" });
    expect(openDrawerStackView(folderStack, detail)).toEqual([{ kind: "main" }, { kind: "favourites" }, { kind: "favourite-folder", folderId: "folder-1" }, detail]);
  });

  it("pops back toward the list root", () => {
    const stack = openDrawerStackView(createDrawerStack("favourites"), { kind: "point-detail", modeId: "radio", pointId: "station-1" });

    expect(canGoBackFromDrawerStack(stack)).toBe(true);
    expect(getCurrentDrawerView(stack)).toBe("point-detail");
    expect(popDrawerStack(stack)).toEqual([{ kind: "main" }, { kind: "favourites" }]);
    expect(popDrawerStack([{ kind: "main" }])).toEqual([{ kind: "main" }]);
  });

  it("uses requested mobile position only when reopening a closed drawer", () => {
    expect(resolveDrawerMobilePosition({
      currentPosition: "closed",
      requestedOpenPosition: "full"
    })).toBe("full");

    expect(resolveDrawerMobilePosition({
      currentPosition: "middle",
      requestedOpenPosition: "full"
    })).toBe("middle");

    expect(resolveDrawerMobilePosition({
      currentPosition: "full",
      requestedOpenPosition: "middle"
    })).toBe("full");
  });
});
