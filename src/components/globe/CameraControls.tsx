"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { TerraPoint } from "@/lib/modes/types";
import {
  DEFAULT_ROTATE_SPEED,
  GLOBE_AUTO_SPIN_SPEED,
  KEYBOARD_ORBIT_RADIANS_PER_SECOND,
  MIN_CAMERA_DISTANCE,
  getKeyboardOrbitIntent,
  getKeyboardOrbitIntentFromKeys,
  latLonToVector3,
  getRotateSpeed
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
  focusPoint,
  focusKey
}: {
  focusPoint: TerraPoint | null;
  focusKey: string | null;
}) {
  const lastFocusKey = useRef<string | null>(null);
  const focusTarget = useRef<CameraFocusTarget | null>(null);
  const target = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!focusPoint || !focusKey || lastFocusKey.current === focusKey) {
      return;
    }

    lastFocusKey.current = focusKey;
    focusTarget.current = {
      distance: null,
      normal: latLonToVector3(focusPoint.latitude, focusPoint.longitude, 1).normalize()
    };
  }, [focusKey, focusPoint]);

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

export function AdaptiveOrbitControls({
  earthSpinEnabled,
  maxDistance
}: {
  earthSpinEnabled: boolean;
  maxDistance: number;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const pressedKeyCodes = useRef(new Set<string>());

  useEffect(() => {
    if (!controlsRef.current) {
      return;
    }

    controlsRef.current.mouseButtons = RIGHT_MOUSE_ORBIT_BUTTONS;
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreKeyboardOrbitEvent(event) || !getKeyboardOrbitIntent(event.code)) {
        return;
      }

      event.preventDefault();
      pressedKeyCodes.current.add(event.code);
    }

    function handleKeyUp(event: KeyboardEvent) {
      pressedKeyCodes.current.delete(event.code);
    }

    function clearPressedKeys() {
      pressedKeyCodes.current.clear();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearPressedKeys);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearPressedKeys);
    };
  }, []);

  useFrame(({ camera }, delta) => {
    if (!controlsRef.current) {
      return;
    }

    const controls = controlsRef.current;
    const rotateSpeed = getRotateSpeed(camera.position.length());
    controls.rotateSpeed = rotateSpeed;

    const keyboardIntent = getKeyboardOrbitIntentFromKeys(pressedKeyCodes.current);

    if (keyboardIntent.azimuth === 0 && keyboardIntent.polar === 0) {
      return;
    }

    const keyboardAngle = KEYBOARD_ORBIT_RADIANS_PER_SECOND * rotateSpeed * delta;
    controls.setAzimuthalAngle(controls.getAzimuthalAngle() + keyboardIntent.azimuth * keyboardAngle);
    controls.setPolarAngle(controls.getPolarAngle() + keyboardIntent.polar * keyboardAngle);
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      enablePan={false}
      autoRotate={earthSpinEnabled}
      autoRotateSpeed={GLOBE_AUTO_SPIN_SPEED}
      maxDistance={maxDistance}
      minDistance={MIN_CAMERA_DISTANCE}
      mouseButtons={RIGHT_MOUSE_ORBIT_BUTTONS}
      rotateSpeed={DEFAULT_ROTATE_SPEED}
    />
  );
}

function shouldIgnoreKeyboardOrbitEvent(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return true;
  }

  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
}
