import { describe, expect, it } from "vitest";
import { advanceDrawerListMomentum, moveDrawerGesture } from "./mobileDrawerMotion";
import { getMobileSheetMetrics } from "./mobileSheetMetrics";

const metrics = getMobileSheetMetrics({ closedHeight: 89, playerHeight: 0, navBottom: 72, viewportHeight: 800 });
const initial = { owner: "list" as const, height: 500, scrollTop: 100, scrollMax: 1000, metrics };

describe("drawer scroll handoff", () => {
  it("consumes scroll distance before sending only excess movement to the drawer", () => {
    const first = moveDrawerGesture({ ...initial, deltaY: 60 });
    expect(first).toEqual({ owner: "list", scrollTop: 40, height: 500 });
    const second = moveDrawerGesture({ ...initial, ...first, deltaY: 70 });
    expect(second).toEqual({ owner: "drawer", scrollTop: 0, height: 475.4 });
    const reversed = moveDrawerGesture({ ...initial, ...second, deltaY: -20 });
    expect(reversed.owner).toBe("drawer");
    expect(reversed.scrollTop).toBe(0);
    expect(reversed.height).toBeCloseTo(491.8);
  });

  it("scrolls upward without expanding the sheet, including at the bottom", () => {
    expect(moveDrawerGesture({ ...initial, deltaY: -30 }).scrollTop).toBe(130);
    expect(moveDrawerGesture({ ...initial, scrollTop: 1000, deltaY: -30 }))
      .toEqual({ owner: "list", scrollTop: 1000, height: 500 });
  });

  it("pulls from empty lists and clamps at both drawer limits", () => {
    expect(moveDrawerGesture({ ...initial, scrollTop: 0, scrollMax: 0, deltaY: 1000 }))
      .toEqual({ owner: "drawer", scrollTop: 0, height: metrics.closedHeight });
    expect(moveDrawerGesture({ ...initial, owner: "drawer", deltaY: -1000 }).height).toBe(metrics.fullHeight);
  });

  it("stops momentum at the list boundaries without moving the drawer", () => {
    expect(advanceDrawerListMomentum(10, 1000, -2, 16)).toEqual({ scrollTop: 0, velocity: 0 });
    expect(advanceDrawerListMomentum(990, 1000, 2, 16)).toEqual({ scrollTop: 1000, velocity: 0 });
    const once = advanceDrawerListMomentum(300, 1000, 1, 32);
    const first = advanceDrawerListMomentum(300, 1000, 1, 16);
    const twice = advanceDrawerListMomentum(first.scrollTop, 1000, first.velocity, 16);
    expect(twice.scrollTop).toBeCloseTo(once.scrollTop);
    expect(twice.velocity).toBeCloseTo(once.velocity);
  });
});
