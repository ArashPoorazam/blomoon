"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { TerraPoint } from "@/lib/modes/types";
import {
  DEFAULT_ROTATE_SPEED,
  MAX_CAMERA_DISTANCE,
  MIN_CAMERA_DISTANCE,
  getRotateSpeed,
  latLonToVector3
} from "./globeMath";

export function CameraFocus({
  focusKey,
  selectedPoint
}: {
  focusKey: string | null;
  selectedPoint: TerraPoint | null;
}) {
  const lastFocusKey = useRef<string | null>(null);
  const focusTarget = useRef<THREE.Vector3 | null>(null);
  const target = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useEffect(() => {
    if (!selectedPoint || !focusKey || lastFocusKey.current === focusKey) {
      return;
    }

    lastFocusKey.current = focusKey;
    focusTarget.current = latLonToVector3(selectedPoint.latitude, selectedPoint.longitude, 1).normalize().multiplyScalar(4.65);
  }, [focusKey, selectedPoint]);

  useFrame(({ camera }, delta) => {
    if (!focusTarget.current) {
      return;
    }

    const alpha = 1 - Math.pow(0.025, delta);

    camera.position.lerp(focusTarget.current, alpha);
    camera.lookAt(target);

    if (camera.position.distanceTo(focusTarget.current) < 0.025) {
      focusTarget.current = null;
    }
  });

  return null;
}

export function AdaptiveOrbitControls() {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useFrame(({ camera }) => {
    if (!controlsRef.current) {
      return;
    }

    controlsRef.current.rotateSpeed = getRotateSpeed(camera.position.length());
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      enablePan={false}
      maxDistance={MAX_CAMERA_DISTANCE}
      minDistance={MIN_CAMERA_DISTANCE}
      rotateSpeed={DEFAULT_ROTATE_SPEED}
    />
  );
}
