import { describe, expect, it } from "vitest";
import {
  canGoBackFromDrawerStack,
  createDrawerStack,
  getCurrentDrawerView,
  isAccountDrawerView,
  openDrawerStackView,
  popDrawerStack
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
    expect(createDrawerStack("main")).toEqual(["main"]);
    expect(createDrawerStack("favourites")).toEqual(["main", "favourites"]);
    expect(createDrawerStack("themes")).toEqual(["main", "account", "themes"]);
  });

  it("pushes point detail from the current drawer branch", () => {
    expect(openDrawerStackView(createDrawerStack("main"), "point-detail")).toEqual(["main", "point-detail"]);
    expect(openDrawerStackView(createDrawerStack("favourites"), "point-detail")).toEqual(["main", "favourites", "point-detail"]);
  });

  it("pops back toward the list root", () => {
    const stack = openDrawerStackView(createDrawerStack("favourites"), "point-detail");

    expect(canGoBackFromDrawerStack(stack)).toBe(true);
    expect(getCurrentDrawerView(stack)).toBe("point-detail");
    expect(popDrawerStack(stack)).toEqual(["main", "favourites"]);
    expect(popDrawerStack(["main"])).toEqual(["main"]);
  });
});
