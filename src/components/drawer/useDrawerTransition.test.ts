// @vitest-environment jsdom
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShellDrawerView } from "../shell/drawerState";
import { useDrawerMotion, useDrawerTransition } from "./useDrawerTransition";

let root: Root;
let container: HTMLElement;
let controller: ReturnType<typeof useDrawerTransition>;
let reduced = false;
let mobile = true;
const navigate = vi.fn();
let appRenders = 0;
function Reader({ motion }: { motion: ReturnType<typeof useDrawerTransition>["motion"] }) {
  const state = useDrawerMotion(motion);
  return createElement("output", null, JSON.stringify(state));
}
function Harness({ view, navigationKey }: { view: ShellDrawerView; navigationKey: string }) {
  controller = useDrawerTransition(view, navigationKey, navigate);
  appRenders++;
  return createElement(Reader, { motion: controller.motion });
}
function mount(view: ShellDrawerView = "main", navigationKey = view) {
  act(() => root.render(createElement(StrictMode, null, createElement(Harness, { view, navigationKey }))));
}
function finish() { act(() => vi.advanceTimersByTime(300)); }
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now());
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduced-motion") ? reduced : mobile, addEventListener() {}, removeEventListener() {} }));
  reduced = false; mobile = true; appRenders = 0; navigate.mockReset();
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  mount();
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("drawer transition", () => {
  it("follows the finger and commits once without rerendering the app during motion", () => {
    const renders = appRenders;
    act(() => { expect(controller.horizontal.begin()).toBe(true); controller.horizontal.move(-120, 400); });
    expect(controller.motion.getSnapshot()).toEqual({ target: "favourites", direction: 1, progress: 0.3 });
    act(() => controller.horizontal.end(-120, 0, 400));
    expect(navigate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(80));
    expect(controller.motion.getSnapshot()!.progress).toBeGreaterThan(0.3);
    finish();
    expect(navigate).toHaveBeenCalledExactlyOnceWith("favourites");
    expect(controller.motion.getSnapshot()).toBeNull();
    expect(appRenders).toBe(renders);
  });
  it("returns a short drag and an edge drag without navigating", () => {
    act(() => { controller.horizontal.begin(); controller.horizontal.move(20, 400); controller.horizontal.end(20, 0, 400); });
    finish(); expect(navigate).not.toHaveBeenCalled();
    mount("mode-switcher");
    act(() => { controller.horizontal.begin(); controller.horizontal.move(200, 400); });
    expect(controller.motion.getSnapshot()).toEqual({ target: null, direction: -1, progress: 0.075 });
    act(() => controller.horizontal.end(200, 1, 400)); finish();
    expect(navigate).not.toHaveBeenCalled();
  });
  it("slides nonadjacent navigation directly and ignores overlapping requests", () => {
    mount("mode-switcher");
    act(() => controller.navigate("account"));
    expect(controller.motion.getSnapshot()?.target).toBe("account");
    act(() => { controller.navigate("history"); expect(controller.horizontal.begin()).toBe(false); });
    finish(); expect(navigate).toHaveBeenCalledExactlyOnceWith("account");
  });
  it("cancels on resize, unrelated navigation, and explicit cancellation", () => {
    act(() => controller.navigate("account"));
    act(() => window.dispatchEvent(new Event("resize"))); finish();
    expect(navigate).not.toHaveBeenCalled();
    act(() => controller.navigate("history")); mount("point-detail"); finish();
    expect(navigate).not.toHaveBeenCalled();
    act(() => { controller.horizontal.begin(); controller.horizontal.move(-200, 400); controller.horizontal.cancel(); });
    expect(controller.motion.getSnapshot()).toBeNull();
  });
  it("uses root navigation for subdrawers and honors desktop and reduced motion", () => {
    mount("point-detail");
    act(() => controller.navigate("main")); expect(navigate).toHaveBeenLastCalledWith("main");
    reduced = true;
    act(() => controller.navigate("history")); expect(controller.motion.getSnapshot()).toBeNull();
    expect(navigate).toHaveBeenLastCalledWith("history");
    mobile = false;
    act(() => controller.navigate("account")); expect(controller.motion.getSnapshot()).toBeNull();
    expect(navigate).toHaveBeenLastCalledWith("account");
  });
});
