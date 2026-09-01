import { describe, expect, it } from "vitest";
import { isAccountDrawerView } from "./drawerState";

describe("shell drawer state", () => {
  it("identifies account-owned drawer views", () => {
    expect(isAccountDrawerView("account")).toBe(true);
    expect(isAccountDrawerView("account-info")).toBe(true);
    expect(isAccountDrawerView("themes")).toBe(true);
    expect(isAccountDrawerView("contact")).toBe(true);
    expect(isAccountDrawerView("favourites")).toBe(false);
    expect(isAccountDrawerView("main")).toBe(false);
  });
});
