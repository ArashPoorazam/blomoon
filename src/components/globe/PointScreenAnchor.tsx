"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import { Vector3, type Camera } from "three";
import { GLOBE_RADIUS } from "@/lib/geo";
import type { TerraPoint } from "@/lib/modes/types";
import { latLonToVector3, MARKER_ALTITUDE } from "./globeMath";

/** Projects one point into canvas-local CSS pixels without rerendering the app. */
export function PointScreenAnchor({ point, target }: {
  point: TerraPoint | null;
  target: RefObject<HTMLElement | null>;
}) {
  const position = useMemo(() => point ? latLonToVector3(point.latitude, point.longitude, GLOBE_RADIUS * MARKER_ALTITUDE) : null, [point]);
  const projected = useMemo(() => new Vector3(), []);
  const previous = useRef("");
  useFrame(({ camera, size }) => {
    const element = target.current;
    if (!element || !position) return;
    const anchor = position ? projectPointAnchor(position, camera, size.width, size.height, projected) : null;
    const next = anchor ? `${anchor.x.toFixed(2)},${anchor.y.toFixed(2)}` : "hidden";
    if (previous.current === next && element.style.visibility) return;
    previous.current = next;
    element.style.visibility = anchor ? "visible" : "hidden";
    if (anchor) {
      element.style.transform = `translate3d(${anchor.x}px, ${anchor.y - 10}px, 0) translate(-50%, -100%)`;
    }
  });
  return null;
}

export function projectPointAnchor(position: Vector3, camera: Camera, width: number, height: number, projected = new Vector3()) {
  if (position.dot(camera.position) <= GLOBE_RADIUS * position.length()) return null;
  projected.copy(position).project(camera);
  if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || Math.abs(projected.z) > 1) return null;
  return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 };
}
