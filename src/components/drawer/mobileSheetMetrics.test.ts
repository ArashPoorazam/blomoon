import { describe, expect, it } from "vitest";
import {
  getAdjacentDrawerPosition,
  getMobileDrawerHeight,
  getMobileGlobeOffset,
  getMobileSheetMetrics,
  resolveMobileDrawerDetent
} from "./mobileSheetMetrics";

const metrics = getMobileSheetMetrics({
  navBottom: 72,
  playerHeight: 92,
  viewportHeight: 800
});

describe("mobile drawer sheet metrics", () => {
  it("reserves the header, middle viewport share, player, nav, and loading slot", () => {
    expect(metrics).toMatchObject({
      closedHeight: 92,
      fullHeight: 590,
      middleHeight: 320,
      sheetBottom: 708
    });
    expect(getMobileDrawerHeight("closed", metrics)).toBe(92);
    expect(getMobileDrawerHeight("middle", metrics)).toBe(320);
    expect(getMobileDrawerHeight("full", metrics)).toBe(590);
    expect(metrics.sheetBottom - metrics.fullHeight - metrics.navBottom).toBe(46);
  });

  it("uses the nearest detent for a slow release", () => {
    expect(resolveMobileDrawerDetent({ height: 210, heightVelocity: 0.1, metrics })).toBe("middle");
    expect(resolveMobileDrawerDetent({ height: 480, heightVelocity: 0, metrics })).toBe("full");
  });

  it("biases fast releases in their gesture direction", () => {
    expect(resolveMobileDrawerDetent({ height: 110, heightVelocity: 0.6, metrics })).toBe("middle");
    expect(resolveMobileDrawerDetent({ height: 330, heightVelocity: 0.6, metrics })).toBe("full");
    expect(resolveMobileDrawerDetent({ height: 300, heightVelocity: -0.6, metrics })).toBe("closed");
  });

  it("caps globe movement at the middle detent", () => {
    expect(getMobileGlobeOffset(metrics.closedHeight, metrics)).toBe(-56);
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
