import { describe, expect, it } from "vitest";
import { getDrawerMobileState, getNextDrawerMobileState } from "./mobileState";

describe("drawer mobile state", () => {
  it("derives closed, compact, list, and detail states", () => {
    expect(getDrawerMobileState({
      collapsed: true,
      expanded: false,
      hasDetail: false,
      showingFavourites: false
    })).toBe("closed");
    expect(getDrawerMobileState({
      collapsed: false,
      expanded: false,
      hasDetail: false,
      showingFavourites: false
    })).toBe("compact");
    expect(getDrawerMobileState({
      collapsed: false,
      expanded: true,
      hasDetail: false,
      showingFavourites: false
    })).toBe("list");
    expect(getDrawerMobileState({
      collapsed: false,
      expanded: false,
      hasDetail: true,
      showingFavourites: false
    })).toBe("detail");
  });

  it("cycles the sheet handle through phone-friendly states", () => {
    expect(getNextDrawerMobileState("closed")).toBe("compact");
    expect(getNextDrawerMobileState("compact")).toBe("list");
    expect(getNextDrawerMobileState("list")).toBe("closed");
    expect(getNextDrawerMobileState("detail")).toBe("closed");
  });
});
