import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { GLOBE_RADIUS } from "@/lib/geo";
import { projectPointAnchor } from "./PointScreenAnchor";

function camera() {
  const result = new PerspectiveCamera(42, 1, .1, 100);
  result.position.set(0, 0, 5);
  result.lookAt(0, 0, 0);
  result.updateMatrixWorld();
  return result;
}
describe("point popup projection", () => {
  it("tracks the marker in canvas coordinates across viewport sizes", () => {
    const point = new Vector3(0, 0, GLOBE_RADIUS);
    expect(projectPointAnchor(point, camera(), 400, 800)).toEqual({ x: 200, y: 400 });
    expect(projectPointAnchor(point, camera(), 800, 400)).toEqual({ x: 400, y: 200 });
  });
  it("hides markers behind the globe and beyond its visible horizon", () => {
    expect(projectPointAnchor(new Vector3(0, 0, -GLOBE_RADIUS), camera(), 400, 800)).toBeNull();
    expect(projectPointAnchor(new Vector3(GLOBE_RADIUS, 0, 0), camera(), 400, 800)).toBeNull();
  });
  it("moves the anchor with the camera rather than leaving it at screen center", () => {
    const moved = camera();
    moved.position.x = 1;
    moved.updateMatrixWorld();
    expect(projectPointAnchor(new Vector3(0, 0, GLOBE_RADIUS), moved, 400, 800)?.x).toBeLessThan(200);
  });
});
