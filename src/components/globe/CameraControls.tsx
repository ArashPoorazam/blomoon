"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { TerraPoint } from "@/lib/modes/types";
import { createCameraTransition } from "./cameraTransition";
import {
  CROSSHAIR_CENTER_TOLERANCE_PX,
  CROSSHAIR_IDLE_DELAY_MS,
  findNearestCrosshairPoint
} from "./crosshairTargeting";
import {
  DEFAULT_ROTATE_SPEED,
  GLOBE_AUTO_SPIN_SPEED,
  KEYBOARD_ORBIT_RADIANS_PER_SECOND,
  MIN_CAMERA_DISTANCE,
  getKeyboardOrbitIntent,
  getKeyboardOrbitIntentFromKeys,
  getRotateSpeed,
  latLonToVector3
} from "./globeMath";

type CameraFocusTarget = {
  transition: ReturnType<typeof createCameraTransition> | null;
  normal: THREE.Vector3;
  point: TerraPoint;
};

type GlobeCameraControllerProps = {
  crosshairEnabled: boolean;
  earthSpinEnabled: boolean;
  focusKey: string | null;
  focusPoint: TerraPoint | null;
  maxDistance: number;
  motionEnabled: boolean;
  points: TerraPoint[];
  onCrosshairPoint: (point: TerraPoint) => void;
  onUserInteractionStart: () => void;
};

const RIGHT_MOUSE_ORBIT_BUTTONS = {
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE
} as const;

export function GlobeCameraController({
  crosshairEnabled,
  earthSpinEnabled,
  focusKey,
  focusPoint,
  maxDistance,
  motionEnabled,
  onCrosshairPoint,
  onUserInteractionStart,
  points
}: GlobeCameraControllerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const pressedKeyCodes = useRef(new Set<string>());
  const lastFocusKey = useRef<string | null>(null);
  const focusTarget = useRef<CameraFocusTarget | null>(null);
  const userInteracting = useRef(false);
  const lastMotionAt = useRef(performance.now());
  const lastEvaluatedPosition = useRef<THREE.Vector3 | null>(null);
  const onCrosshairPointRef = useRef(onCrosshairPoint);
  const onUserInteractionStartRef = useRef(onUserInteractionStart);
  const { height, width } = useThree((state) => state.size);
  const origin = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    onCrosshairPointRef.current = onCrosshairPoint;
    onUserInteractionStartRef.current = onUserInteractionStart;
  }, [onCrosshairPoint, onUserInteractionStart]);

  const markMotion = useCallback(() => {
    lastMotionAt.current = performance.now();
    lastEvaluatedPosition.current = null;
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;

    if (controls) {
      controls.mouseButtons = RIGHT_MOUSE_ORBIT_BUTTONS;
    }
  }, []);

  useEffect(() => {
    if (!focusPoint || !focusKey || lastFocusKey.current === focusKey) {
      return;
    }

    lastFocusKey.current = focusKey;
    focusTarget.current = createFocusTarget(focusPoint);
    markMotion();
  }, [focusKey, focusPoint, markMotion]);

  useEffect(() => {
    lastEvaluatedPosition.current = null;
  }, [crosshairEnabled, points]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreKeyboardOrbitEvent(event) || !getKeyboardOrbitIntent(event.code)) {
        return;
      }

      event.preventDefault();
      focusTarget.current = null;
      if (!pressedKeyCodes.current.has(event.code)) {
        onUserInteractionStartRef.current();
      }
      pressedKeyCodes.current.add(event.code);
      markMotion();
    }

    function handleKeyUp(event: KeyboardEvent) {
      pressedKeyCodes.current.delete(event.code);
      lastMotionAt.current = performance.now();
    }

    function clearPressedKeys() {
      pressedKeyCodes.current.clear();
      lastMotionAt.current = performance.now();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearPressedKeys);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearPressedKeys);
    };
  }, [markMotion]);

  useFrame(({ camera }, delta) => {
    const controls = controlsRef.current;

    if (!controls) {
      return;
    }

    const rotateSpeed = getRotateSpeed(camera.position.length());
    controls.rotateSpeed = rotateSpeed;
    const keyboardIntent = getKeyboardOrbitIntentFromKeys(pressedKeyCodes.current);

    if (keyboardIntent.azimuth !== 0 || keyboardIntent.polar !== 0) {
      const keyboardAngle = KEYBOARD_ORBIT_RADIANS_PER_SECOND * rotateSpeed * delta;
      controls.setAzimuthalAngle(controls.getAzimuthalAngle() + keyboardIntent.azimuth * keyboardAngle);
      controls.setPolarAngle(controls.getPolarAngle() + keyboardIntent.polar * keyboardAngle);
      markMotion();
    }

    const currentFocus = focusTarget.current;

    if (currentFocus) {
      currentFocus.transition ??= createCameraTransition(camera.position, currentFocus.normal);
      const complete = currentFocus.transition.advance(camera.position, delta, motionEnabled);

      camera.lookAt(origin);
      markMotion();

      if (complete) {
        focusTarget.current = null;
        lastMotionAt.current = performance.now();

        if (crosshairEnabled) {
          lastEvaluatedPosition.current = camera.position.clone();
          onCrosshairPointRef.current(currentFocus.point);
        }
      }

      return;
    }

    if (earthSpinEnabled || userInteracting.current || pressedKeyCodes.current.size > 0) {
      markMotion();
      return;
    }

    if (performance.now() - lastMotionAt.current < CROSSHAIR_IDLE_DELAY_MS) {
      return;
    }

    if (!crosshairEnabled || lastEvaluatedPosition.current?.distanceToSquared(camera.position) === 0) {
      return;
    }

    lastEvaluatedPosition.current = camera.position.clone();
    const candidate = findNearestCrosshairPoint({ camera, height, points, width });

    if (!candidate) {
      return;
    }

    if (candidate.distancePx <= CROSSHAIR_CENTER_TOLERANCE_PX) {
      onCrosshairPointRef.current(candidate.point);
      return;
    }

    focusTarget.current = createFocusTarget(candidate.point);
    markMotion();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      autoRotate={earthSpinEnabled}
      autoRotateSpeed={GLOBE_AUTO_SPIN_SPEED}
      enableDamping
      enablePan={false}
      maxDistance={maxDistance}
      minDistance={MIN_CAMERA_DISTANCE}
      mouseButtons={RIGHT_MOUSE_ORBIT_BUTTONS}
      rotateSpeed={DEFAULT_ROTATE_SPEED}
      onChange={markMotion}
      onEnd={() => {
        userInteracting.current = false;
        lastMotionAt.current = performance.now();
      }}
      onStart={() => {
        userInteracting.current = true;
        focusTarget.current = null;
        onUserInteractionStartRef.current();
        markMotion();
      }}
    />
  );
}

function createFocusTarget(point: TerraPoint): CameraFocusTarget {
  return {
    transition: null,
    normal: latLonToVector3(point.latitude, point.longitude, 1).normalize(),
    point
  };
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
