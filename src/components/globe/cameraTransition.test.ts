import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { createCameraTransition } from "./cameraTransition";

describe("bounded spherical camera focus", () => {
  it("crosses antipodes without entering the globe and finishes within 450ms", () => {
    const position = new Vector3(0, 0, 3);
    const target = new Vector3(0, 0, -1);
    const transition = createCameraTransition(position, target);
    for (let i = 0; i < 26; i++) {
      expect(transition.advance(position, 1 / 60, true)).toBe(false);
      expect(position.length()).toBeCloseTo(3);
    }
    expect(transition.advance(position, 1 / 30, true)).toBe(true);
    expect(position.distanceTo(target.multiplyScalar(3))).toBeLessThan(1e-9);
  });
  it("honors reduced motion and can replace a moving destination", () => {
    const position = new Vector3(0, 0, 3);
    createCameraTransition(position, new Vector3(1, 0, 0)).advance(position, 0.2, true);
    expect(createCameraTransition(position, new Vector3(0, 1, 0)).advance(position, 0, false)).toBe(true);
    expect(position.distanceTo(new Vector3(0, 3, 0))).toBeLessThan(1e-9);
  });
});
