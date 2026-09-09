"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { TerraPoint } from "@/lib/modes/types";
import { getViewportFitDistance } from "./cameraFit";
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
  MAX_CAMERA_DISTANCE,
  getKeyboardOrbitIntent,
  getKeyboardOrbitIntentFromKeys,
  getRotateSpeed,
  latLonToVector3
} from "./globeMath";

type CameraFocusTarget = {
  transition: ReturnType<typeof createCameraTransition> | null;
  normal: THREE.Vector3;
  point: TerraPoint;
  automatic: boolean;
};

type GlobeCameraControllerProps = {
  crosshairEnabled: boolean;
  fitViewport: boolean;
  earthSpinEnabled: boolean;
  focusKey: string | null;
  focusPoint: TerraPoint | null;
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
  fitViewport,
  earthSpinEnabled,
  focusKey,
  focusPoint,
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
  const camera = useThree((state) => state.camera);
  const previousFitDistance = useRef<number | null>(null);
  const fittedDistance = fitViewport ? getViewportFitDistance(width, height) : MAX_CAMERA_DISTANCE;
  const origin = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    if (!fitViewport) { previousFitDistance.current = null; return; }
    const previous = previousFitDistance.current;
    // Resize preserves a user's zoom unless they are at the overview limit.
    if (previous === null || camera.position.length() >= previous - 0.05) {
      camera.position.setLength(fittedDistance);
      controlsRef.current?.update();
    }
    previousFitDistance.current = fittedDistance;
  }, [camera, fitViewport, fittedDistance]);

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
    if (!crosshairEnabled && focusTarget.current?.automatic) focusTarget.current = null;
  }, [crosshairEnabled, points]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || shouldIgnoreKeyboardOrbitEvent(event) || !getKeyboardOrbitIntent(event.code)) {
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
      if (!currentFocus.transition) {
        // Drain residual orbit damping before capturing the start of scripted travel.
        controls.enableDamping = false;
        controls.update();
        currentFocus.transition = createCameraTransition(camera.position, currentFocus.normal);
      }
      controls.autoRotate = false;
      const complete = currentFocus.transition.advance(camera.position, delta, motionEnabled);

      camera.lookAt(origin);
      markMotion();

      if (complete) {
        focusTarget.current = null;
        controls.enableDamping = motionEnabled;
        controls.update();
        lastMotionAt.current = performance.now();

        if (crosshairEnabled) {
          lastEvaluatedPosition.current = camera.position.clone();
          onCrosshairPointRef.current(currentFocus.point);
        }
      }

      return;
    }

    controls.enableDamping = motionEnabled;
    controls.autoRotate = earthSpinEnabled;

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

    focusTarget.current = createFocusTarget(candidate.point, true);
    markMotion();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      autoRotate={earthSpinEnabled}
      autoRotateSpeed={GLOBE_AUTO_SPIN_SPEED}
      enableDamping={motionEnabled}
      enablePan={false}
      maxDistance={fittedDistance}
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

function createFocusTarget(point: TerraPoint, automatic = false): CameraFocusTarget {
  return {
    automatic,
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
