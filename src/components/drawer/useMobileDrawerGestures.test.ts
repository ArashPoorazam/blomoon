// @vitest-environment jsdom
import { act, createElement, StrictMode, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DrawerMobilePosition } from "../shell/drawerState";
import { MobileDrawerHandle } from "./MobileDrawerHandle";
import { useMobileDrawerGestures } from "./useMobileDrawerGestures";

let root: Root;
let container: HTMLElement;
let clock = 0;
let reduced = true;
let mobile = true;
let listClass = "point-list";
const clicked = vi.fn();
const positions = vi.fn();
const captured = new Set<number>();

function Harness({ navigationKey = "main" }: { navigationKey?: string }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const [mobilePosition, setPosition] = useState<DrawerMobilePosition>("middle");
  useMobileDrawerGestures({ drawerRef, shellRef, mobilePosition, navigationKey, onMobilePositionChange: setPosition });
  positions(mobilePosition);
  return createElement("div", { ref: shellRef }, createElement("aside", { ref: drawerRef, className: "drawer" },
    createElement(MobileDrawerHandle, { mobilePosition, onMobilePositionChange: setPosition }),
    createElement("div", { className: "drawer-header" },
      createElement("h2", null, "Stations"), createElement("button", { onClick: clicked }, "Header action")),
    createElement("div", { className: "drawer-search-controls" }, createElement("input")),
    createElement("div", { className: listClass }, createElement("button", { onClick: clicked }, "Station"))));
}

function element(selector: string) { return container.querySelector<HTMLElement>(selector)!; }
function height() { return Number.parseFloat(element("div").style.getPropertyValue("--mobile-sheet-visible-height")); }
function pointer(target: HTMLElement | Window, type: string, y: number, options: { x?: number; id?: number; pointerType?: string; elapsed?: number } = {}) {
  clock += options.elapsed ?? 16;
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY: y, clientX: options.x ?? 20, button: 0 });
  Object.defineProperties(event, {
    pointerId: { value: options.id ?? 1 }, isPrimary: { value: (options.id ?? 1) === 1 },
    pointerType: { value: options.pointerType ?? "touch" }, timeStamp: { value: clock }
  });
  act(() => target.dispatchEvent(event));
}
function click(target: HTMLElement, detail = 1) { act(() => target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail }))); }
async function mount(navigationKey = "main") {
  await act(async () => root.render(createElement(StrictMode, null, createElement(Harness, { navigationKey }))));
  Object.defineProperties(element(`.${listClass.split(" ")[0]}`), { scrollHeight: { configurable: true, value: 1400 }, clientHeight: { configurable: true, value: 200 } });
}

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  reduced = true; mobile = true; clock = 0; listClass = "point-list";
  captured.clear(); clicked.mockReset(); positions.mockReset();
  vi.stubGlobal("matchMedia", (query: string) => ({ get matches() { return query.includes("reduced-motion") ? reduced : mobile; }, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const value = Number.parseFloat(this.parentElement?.style.getPropertyValue("--mobile-sheet-visible-height") ?? "") || 320;
    return { x: 0, y: 0, top: 0, bottom: 89, left: 0, right: 390, width: 390, height: value, toJSON: () => ({}) };
  });
  vi.stubGlobal("innerHeight", 800);
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { configurable: true, value: (id: number) => captured.add(id) },
    hasPointerCapture: { configurable: true, value: (id: number) => captured.has(id) },
    releasePointerCapture: { configurable: true, value: (id: number) => captured.delete(id) }
  });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await mount();
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe("mobile drawer gestures", () => {
  it("preserves header taps, suppresses drag clicks across a detent rerender, and keeps keyboard activation", () => {
    const button = element(".drawer-header button");
    pointer(button, "pointerdown", 300); pointer(window, "pointerup", 301); click(button);
    expect(clicked).toHaveBeenCalledTimes(1);
    pointer(button, "pointerdown", 300); pointer(window, "pointermove", 500); pointer(window, "pointerup", 500);
    expect(height()).toBe(89);
    click(button); expect(clicked).toHaveBeenCalledTimes(1);
    click(button, 0); expect(clicked).toHaveBeenCalledTimes(2);
    pointer(button, "pointerdown", 400); pointer(window, "pointermove", 200); pointer(window, "pointerup", 200);
    expect(positions).toHaveBeenLastCalledWith("middle");
  });

  it.each(["point-list", "point-list history-list", "favourites-body"])("hands off continuously from %s and retains drawer ownership on reversal", async (className) => {
    listClass = className; await mount();
    const list = element(`.${className.split(" ")[0]}`);
    list.scrollTop = 100;
    pointer(list.firstElementChild as HTMLElement, "pointerdown", 300);
    pointer(window, "pointermove", 360);
    expect(list.scrollTop).toBe(40); expect(height()).toBe(320);
    pointer(window, "pointermove", 430);
    expect(list.scrollTop).toBe(0); expect(height()).toBeCloseTo(295.4);
    pointer(window, "pointermove", 410);
    expect(list.scrollTop).toBe(0); expect(height()).toBeCloseTo(311.8);
    pointer(window, "pointerup", 410, { elapsed: 150 });
    expect(positions).toHaveBeenLastCalledWith("middle");
    click(list.firstElementChild as HTMLElement); expect(clicked).not.toHaveBeenCalled();
  });

  it("scrolls upward at the top without expanding, and decelerates only the list", () => {
    reduced = false; vi.useFakeTimers();
    const list = element(".point-list"); list.scrollTop = 10;
    pointer(list, "pointerdown", 300); pointer(window, "pointermove", 200); pointer(window, "pointerup", 200);
    expect(list.scrollTop).toBe(110);
    act(() => vi.advanceTimersByTime(80));
    expect(list.scrollTop).toBeGreaterThan(110); expect(height()).toBe(320);
    pointer(list, "pointerdown", 300);
    const stopped = list.scrollTop;
    act(() => vi.advanceTimersByTime(100)); expect(list.scrollTop).toBe(stopped);
  });

  it("does not fling after a pause or under reduced motion", () => {
    vi.useFakeTimers();
    const list = element(".point-list");
    pointer(list, "pointerdown", 300); pointer(window, "pointermove", 200); pointer(window, "pointerup", 200);
    act(() => vi.advanceTimersByTime(300)); expect(list.scrollTop).toBe(100);
    reduced = false;
    pointer(list, "pointerdown", 300); pointer(window, "pointermove", 200); pointer(window, "pointerup", 200, { elapsed: 200 });
    act(() => vi.advanceTimersByTime(300)); expect(list.scrollTop).toBe(200);
  });

  it.each(["pointercancel", "lostpointercapture"])("cleans up on %s", (type) => {
    const header = element(".drawer-header");
    pointer(header, "pointerdown", 300); pointer(window, "pointermove", 400);
    expect(captured.size).toBe(1);
    pointer(header, type, 400);
    expect(captured.size).toBe(0); expect(height()).toBe(320);
    expect(element("div").hasAttribute("data-mobile-drawer-dragging")).toBe(false);
  });

  it("does not cancel when implicit touch capture transfers from a child to its drag surface", () => {
    const button = element(".drawer-header button");
    pointer(button, "pointerdown", 300); pointer(window, "pointermove", 330);
    pointer(button, "lostpointercapture", 330);
    pointer(window, "pointermove", 400);
    expect(height()).toBeCloseTo(238);
    expect(captured.size).toBe(1);
    expect(element("div").hasAttribute("data-mobile-drawer-dragging")).toBe(true);
  });

  it("cancels on multitouch, resize, and drawer navigation", async () => {
    const header = element(".drawer-header");
    pointer(header, "pointerdown", 300); pointer(window, "pointermove", 400);
    pointer(header, "pointerdown", 400, { id: 2 }); expect(height()).toBe(320);
    pointer(header, "pointerdown", 300); pointer(window, "pointermove", 400);
    act(() => window.dispatchEvent(new Event("resize"))); expect(height()).toBe(320);
    pointer(header, "pointerdown", 300); pointer(window, "pointermove", 400);
    await mount("history"); expect(height()).toBe(320); expect(captured.size).toBe(0);
  });

  it("ignores desktop, horizontal swipes, mouse list drags, and editable controls", () => {
    const header = element(".drawer-header");
    mobile = false;
    pointer(header, "pointerdown", 300); pointer(window, "pointermove", 500); expect(height()).toBe(320);
    mobile = true;
    pointer(header, "pointerdown", 300); pointer(window, "pointermove", 301, { x: 100 });
    pointer(window, "pointermove", 500); expect(height()).toBe(320);
    pointer(element("input"), "pointerdown", 300); pointer(window, "pointermove", 500); expect(height()).toBe(320);
    pointer(element(".point-list"), "pointerdown", 300, { pointerType: "mouse" });
    pointer(window, "pointermove", 500, { pointerType: "mouse" }); expect(height()).toBe(320);
  });

  it("retains handle keyboard controls", () => {
    const handle = element(".drawer-sheet-handle");
    for (const [key, expected] of [["End", "full"], ["ArrowDown", "middle"], ["Home", "closed"], ["ArrowUp", "middle"]]) {
      act(() => handle.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));
      expect(positions).toHaveBeenLastCalledWith(expected);
    }
  });
});
