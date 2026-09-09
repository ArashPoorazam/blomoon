import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAdjacentDrawerPosition,
  getMobileDrawerHeight,
  getMeasuredMobileClosedHeight,
  getMobileGlobeOffset,
  getMobileSheetMetrics,
  resolveMobileDrawerDetent
} from "./mobileSheetMetrics";

const metrics = getMobileSheetMetrics({
  closedHeight: 89,
  navBottom: 72,
  playerHeight: 92,
  viewportHeight: 800
});

describe("mobile drawer sheet metrics", () => {
  it("reserves the header, middle viewport share, player, nav, and loading slot", () => {
    expect(metrics).toMatchObject({
      closedHeight: 89,
      fullHeight: 590,
      middleHeight: 320,
      sheetBottom: 708
    });
    expect(getMobileDrawerHeight("closed", metrics)).toBe(89);
    expect(getMobileDrawerHeight("middle", metrics)).toBe(320);
    expect(getMobileDrawerHeight("full", metrics)).toBe(590);
    expect(metrics.sheetBottom - metrics.fullHeight - metrics.navBottom).toBe(46);
  });

  it("accounts for expanded headers and multiline player errors", () => {
    const expanded = getMobileSheetMetrics({ closedHeight: 120, playerHeight: 160, navBottom: 72, viewportHeight: 800 });
    expect(expanded.closedHeight).toBe(120);
    expect(expanded.sheetBottom).toBe(640);
    expect(expanded.fullHeight).toBe(522);
    expect(getMobileDrawerHeight("closed", expanded)).toBe(120);
  });

  it("uses the nearest detent for a slow release", () => {
    expect(resolveMobileDrawerDetent({ height: 230, heightVelocity: 0.1, metrics })).toBe("middle");
    expect(resolveMobileDrawerDetent({ height: 480, heightVelocity: 0, metrics })).toBe("full");
  });

  it("biases fast releases in their gesture direction", () => {
    expect(resolveMobileDrawerDetent({ height: 110, heightVelocity: 0.6, metrics })).toBe("middle");
    expect(resolveMobileDrawerDetent({ height: 330, heightVelocity: 0.6, metrics })).toBe("full");
    expect(resolveMobileDrawerDetent({ height: 300, heightVelocity: -0.6, metrics })).toBe("closed");
  });

  it("caps globe movement at the middle detent", () => {
    expect(getMobileGlobeOffset(metrics.closedHeight, metrics)).toBe(-54);
    expect(getMobileGlobeOffset(metrics.middleHeight, metrics)).toBe(-170);
    expect(getMobileGlobeOffset(metrics.fullHeight, metrics)).toBe(-170);
  });

  it("moves keyboard controls through adjacent detents", () => {
    expect(getAdjacentDrawerPosition("closed", "open")).toBe("middle");
    expect(getAdjacentDrawerPosition("middle", "open")).toBe("full");
    expect(getAdjacentDrawerPosition("full", "close")).toBe("middle");
    expect(getAdjacentDrawerPosition("closed", "close")).toBe("closed");
  });
});


describe("measured mobile drawer header", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("includes the handle and border and follows a taller replacement header", () => {
    class MeasuredElement {
      constructor(public bounds: { top: number; bottom: number }) {}
      getBoundingClientRect() { return this.bounds; }
      querySelector() { return header; }
    }
    let header = new MeasuredElement({ top: 525, bottom: 589 });
    const drawer = new MeasuredElement({ top: 500, bottom: 800 });
    vi.stubGlobal("HTMLElement", MeasuredElement);
    vi.stubGlobal("document", { querySelector: () => drawer });
    expect(getMeasuredMobileClosedHeight()).toBe(89);
    header = new MeasuredElement({ top: 525, bottom: 615.5 });
    expect(getMeasuredMobileClosedHeight()).toBe(116);
  });

  it("uses the compact fallback until a header is mounted", () => {
    vi.stubGlobal("HTMLElement", class {});
    vi.stubGlobal("document", { querySelector: () => null });
    expect(getMeasuredMobileClosedHeight()).toBe(89);
  });
});
