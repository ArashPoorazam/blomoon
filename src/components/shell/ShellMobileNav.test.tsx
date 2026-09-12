// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShellMobileNav } from "./ShellMobileNav";
import type { ShellDrawerView } from "./drawerState";
import type { DrawerMotion, DrawerTransitionState } from "../drawer/useDrawerTransition";
import { defaultMode } from "@/lib/modes/registry";

vi.mock("next/image", () => ({ default: () => <img alt="" /> }));
let root: Root;
let container: HTMLElement;
let state: DrawerTransitionState | null;
const listeners = new Set<() => void>();
const motion: DrawerMotion = { getSnapshot: () => state, subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; } };
const navigate = vi.fn();
function mount(view: ShellDrawerView) {
  act(() => root.render(<ShellMobileNav activeMode={defaultMode} activeView={view} motion={motion} onNavigate={navigate} />));
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state = null; listeners.clear(); navigate.mockReset();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) { return Array.from(this.parentElement!.children).filter(e => e.tagName === "BUTTON").indexOf(this) * 60; });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(42);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(42);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("mobile navigation indicator", () => {
  it.each([
    ["main", "main"], ["point-detail", "main"], ["history", "history"], ["mode-switcher", "mode-switcher"],
    ["favourites", "favourites"], ["favourite-folder", "favourites"], ["account", "account"],
    ["account-info", "account"], ["themes", "account"], ["contact", "account"]
  ] as const)("keeps exactly one persistent owner for %s", (view, owner) => {
    mount(view);
    const active = container.querySelectorAll('[aria-current="page"]');
    expect(active).toHaveLength(1);
    expect(active[0].getAttribute("data-drawer")).toBe(owner);
    expect(container.querySelector<HTMLElement>(".shell-mobile-nav-indicator")!.style.height).toBe(owner === "main" ? "2px" : "42px");
  });
  it("interpolates the same indicator and restores it after cancellation", () => {
    mount("history");
    const marker = container.querySelector<HTMLElement>(".shell-mobile-nav-indicator")!;
    expect(marker.style.transform).toBe("translate(60px, 0px)");
    act(() => { state = { target: "main", direction: 1, progress: 0.5 }; listeners.forEach(fn => fn()); });
    expect(marker.style.transform).toBe("translate(90px, 20px)");
    expect(marker.style.height).toBe("22px");
    act(() => { state = null; listeners.forEach(fn => fn()); });
    expect(marker.style.transform).toBe("translate(60px, 0px)");
  });
  it("dispatches top navigation using the shared drawer IDs", () => {
    mount("main");
    act(() => container.querySelector<HTMLButtonElement>('[data-drawer="account"]')!.click());
    expect(navigate).toHaveBeenCalledExactlyOnceWith("account");
  });
});
