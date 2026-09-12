import { describe, expect, it } from "vitest";
import { getAdjacentMainDrawer, getMainDrawer, MAIN_DRAWERS, shouldCommitDrawerSwipe } from "./mainDrawerNavigation";

describe("main drawer navigation", () => {
  it("uses the top navigation order and stops at both ends", () => {
    expect(MAIN_DRAWERS).toEqual(["mode-switcher", "history", "main", "favourites", "account"]);
    expect(getAdjacentMainDrawer("mode-switcher", -1)).toBeNull();
    expect(getAdjacentMainDrawer("account", 1)).toBeNull();
    expect(getAdjacentMainDrawer("history", 1)).toBe("main");
    expect(getAdjacentMainDrawer("favourites", -1)).toBe("main");
  });
  it("groups subdrawers independently of their Back stack", () => {
    expect(getMainDrawer("point-detail")).toBe("main");
    expect(getAdjacentMainDrawer("point-detail", -1)).toBe("history");
    expect(getAdjacentMainDrawer("point-detail", 1)).toBe("favourites");
    expect(getMainDrawer("favourite-folder")).toBe("favourites");
    for (const view of ["account-info", "themes", "contact"] as const) expect(getMainDrawer(view)).toBe("account");
  });
  it("requires distance or a deliberate flick in the drag direction", () => {
    expect(shouldCommitDrawerSwipe(99, 0, 400)).toBe(false);
    expect(shouldCommitDrawerSwipe(100, 0, 400)).toBe(true);
    expect(shouldCommitDrawerSwipe(-100, 0, 400)).toBe(true);
    expect(shouldCommitDrawerSwipe(29, 1, 400)).toBe(false);
    expect(shouldCommitDrawerSwipe(30, 0.5, 400)).toBe(true);
    expect(shouldCommitDrawerSwipe(-30, -0.5, 400)).toBe(true);
    expect(shouldCommitDrawerSwipe(30, -1, 400)).toBe(false);
  });
});
