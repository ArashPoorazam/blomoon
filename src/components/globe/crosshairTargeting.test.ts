import { describe, expect, it } from "vitest";
import * as THREE from "three";
import type { TerraPoint } from "@/lib/modes/types";
import { findNearestCrosshairPoint } from "./crosshairTargeting";

describe("crosshair point targeting", () => {
  it("selects the closest front-facing point inside the capture radius", () => {
    const candidate = findNearestCrosshairPoint({
      camera: createCamera(),
      height: 800,
      points: [point("farther", 0, -88), point("center", 0, -90)],
      width: 400
    });

    expect(candidate?.point.id).toBe("center");
    expect(candidate?.distancePx).toBeCloseTo(0, 5);
  });

  it("rejects points outside the capture radius", () => {
    const candidate = findNearestCrosshairPoint({
      camera: createCamera(),
      height: 800,
      points: [point("outside", 0, -70)],
      radiusPx: 8,
      width: 400
    });

    expect(candidate).toBeNull();
  });

  it("rejects points on the rear hemisphere", () => {
    const candidate = findNearestCrosshairPoint({
      camera: createCamera(),
      height: 800,
      points: [point("rear", 0, 90)],
      radiusPx: 1000,
      width: 400
    });

    expect(candidate).toBeNull();
  });

  it("keeps source order when points are equally close", () => {
    const candidate = findNearestCrosshairPoint({
      camera: createCamera(),
      height: 800,
      points: [point("first", 0, -90), point("second", 0, -90)],
      width: 400
    });

    expect(candidate?.point.id).toBe("first");
  });
});

function createCamera() {
  const camera = new THREE.PerspectiveCamera(42, 0.5, 0.1, 100);
  camera.position.set(0, 0, 5.2);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return camera;
}

function point(id: string, latitude: number, longitude: number): TerraPoint {
  return {
    id,
    latitude,
    longitude,
    modeId: "radio",
    name: id,
    summary: "Test station"
  };
}
