import { describe, expect, it } from "vitest";
import {
  getKeyboardOrbitIntent,
  getKeyboardOrbitIntentFromKeys,
  MAX_CAMERA_DISTANCE,
  MOBILE_MAX_CAMERA_DISTANCE
} from "./globeMath";

describe("globe interaction math", () => {
  it("maps WASD and arrow keys to orbit directions", () => {
    expect(getKeyboardOrbitIntent("KeyA")).toEqual({ azimuth: -1, polar: 0 });
    expect(getKeyboardOrbitIntent("ArrowLeft")).toEqual({ azimuth: -1, polar: 0 });
    expect(getKeyboardOrbitIntent("KeyD")).toEqual({ azimuth: 1, polar: 0 });
    expect(getKeyboardOrbitIntent("ArrowRight")).toEqual({ azimuth: 1, polar: 0 });
    expect(getKeyboardOrbitIntent("KeyW")).toEqual({ azimuth: 0, polar: -1 });
    expect(getKeyboardOrbitIntent("ArrowUp")).toEqual({ azimuth: 0, polar: -1 });
    expect(getKeyboardOrbitIntent("KeyS")).toEqual({ azimuth: 0, polar: 1 });
    expect(getKeyboardOrbitIntent("ArrowDown")).toEqual({ azimuth: 0, polar: 1 });
    expect(getKeyboardOrbitIntent("Enter")).toBeNull();
  });

  it("combines active keyboard orbit directions without exceeding one step per axis", () => {
    expect(getKeyboardOrbitIntentFromKeys(["KeyA", "KeyD"])).toEqual({ azimuth: 0, polar: 0 });
    expect(getKeyboardOrbitIntentFromKeys(["KeyD", "KeyW"])).toEqual({ azimuth: 1, polar: -1 });
    expect(getKeyboardOrbitIntentFromKeys(["KeyD", "ArrowRight"])).toEqual({ azimuth: 1, polar: 0 });
  });

  it("allows mobile profiles to zoom farther out than desktop", () => {
    expect(MOBILE_MAX_CAMERA_DISTANCE).toBeGreaterThan(MAX_CAMERA_DISTANCE);
  });
});
