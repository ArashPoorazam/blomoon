import { describe, expect, it } from "vitest";
import { GLOBE_RADIUS } from "@/lib/geo";
import { getViewportFitDistance, GLOBE_CAMERA_FOV } from "./cameraFit";

describe("mobile globe framing", () => {
  it.each([[320, 568], [390, 844], [430, 932], [844, 390]])("fits both axes at %s × %s", (width, height) => {
    const distance = getViewportFitDistance(width, height);
    const vertical = GLOBE_CAMERA_FOV * Math.PI / 360;
    const horizontal = Math.atan(Math.tan(vertical) * width / height);
    const apparentRadius = Math.asin(GLOBE_RADIUS / distance);
    expect(apparentRadius).toBeLessThan(vertical);
    expect(apparentRadius).toBeLessThan(horizontal);
  });
  it("moves farther out for a narrower portrait viewport", () => {
    expect(getViewportFitDistance(320, 844)).toBeGreaterThan(getViewportFitDistance(430, 844));
  });
});
