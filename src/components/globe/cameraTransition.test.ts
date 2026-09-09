import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { createCameraTransition } from "./cameraTransition";

describe("bounded spherical camera focus", () => {
  it("crosses antipodes outside the globe and finishes within 800ms", () => {
    const position = new Vector3(0, 0, 3);
    const transition = createCameraTransition(position, new Vector3(0, 0, -1));
    for (let i = 0; i < 47; i++) {
      expect(transition.advance(position, 1 / 60, true)).toBe(false);
      expect(position.length()).toBeCloseTo(3);
    }
    expect(transition.advance(position, 1 / 30, true)).toBe(true);
    expect(position.distanceTo(new Vector3(0, 0, -3))).toBeLessThan(1e-9);
  });
  it("accelerates and decelerates, with shorter travel for nearby points", () => {
    const position = new Vector3(0, 0, 3);
    const transition = createCameraTransition(position, new Vector3(0, 0, -1));
    const distances: number[] = [];
    for (let i = 0; i < 8; i++) {
      const previous = position.clone();
      transition.advance(position, 0.1, true);
      distances.push(previous.distanceTo(position));
    }
    expect(distances[0]).toBeLessThan(distances[3]);
    expect(distances[7]).toBeLessThan(distances[4]);
    const nearby = new Vector3(.05, 0, 1).normalize();
    expect(createCameraTransition(new Vector3(0, 0, 3), nearby).advance(position, .3, true)).toBe(true);
  });
  it("honors reduced motion and replaces a moving destination from its current position", () => {
    const position = new Vector3(0, 0, 3);
    createCameraTransition(position, new Vector3(1, 0, 0)).advance(position, 0.2, true);
    const before = position.clone();
    const replacement = createCameraTransition(position, new Vector3(0, 1, 0));
    replacement.advance(position, 0, true);
    expect(position.distanceTo(before)).toBeLessThan(1e-9);
    expect(replacement.advance(position, 0, false)).toBe(true);
    expect(position.distanceTo(new Vector3(0, 3, 0))).toBeLessThan(1e-9);
  });
});
