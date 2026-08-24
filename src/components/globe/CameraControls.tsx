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

type CameraFocusTarget = {
  distance: number | null;
  normal: THREE.Vector3;
};

const RIGHT_MOUSE_ORBIT_BUTTONS = {
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE
} as const;

export function CameraFocus({
  focusKey,
  selectedPoint
}: {
  focusKey: string | null;
  selectedPoint: TerraPoint | null;
}) {
  const lastFocusKey = useRef<string | null>(null);
  const focusTarget = useRef<CameraFocusTarget | null>(null);
  const target = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!selectedPoint || !focusKey || lastFocusKey.current === focusKey) {
      return;
    }

    lastFocusKey.current = focusKey;
    focusTarget.current = {
      distance: null,
      normal: latLonToVector3(selectedPoint.latitude, selectedPoint.longitude, 1).normalize()
    };
  }, [focusKey, selectedPoint]);

  useFrame(({ camera }, delta) => {
    if (!focusTarget.current) {
      return;
    }

    focusTarget.current.distance ??= camera.position.length();
    targetPosition.copy(focusTarget.current.normal).multiplyScalar(focusTarget.current.distance);

    const alpha = 1 - Math.pow(0.025, delta);
    camera.position.lerp(targetPosition, alpha).setLength(focusTarget.current.distance);
    camera.lookAt(target);

    if (camera.position.distanceTo(targetPosition) < 0.025) {
      focusTarget.current = null;
    }
  });

  return null;
}

export function AdaptiveOrbitControls() {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (!controlsRef.current) {
      return;
    }

    controlsRef.current.mouseButtons = RIGHT_MOUSE_ORBIT_BUTTONS;
  }, []);

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
      mouseButtons={RIGHT_MOUSE_ORBIT_BUTTONS}
      rotateSpeed={DEFAULT_ROTATE_SPEED}
    />
  );
}
