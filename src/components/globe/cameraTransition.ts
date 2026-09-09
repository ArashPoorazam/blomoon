import * as THREE from "three";

export const CAMERA_FOCUS_MIN_SECONDS = 0.25;
export const CAMERA_FOCUS_MAX_SECONDS = 0.8;

/** Quaternion interpolation keeps the camera outside the globe, including antipodes. */
export function createCameraTransition(position: THREE.Vector3, normal: THREE.Vector3) {
  const start = position.clone().normalize();
  const rotation = new THREE.Quaternion().setFromUnitVectors(start, normal);
  const interpolated = new THREE.Quaternion();
  const identity = new THREE.Quaternion();
  const distance = position.length();
  const duration = THREE.MathUtils.lerp(CAMERA_FOCUS_MIN_SECONDS, CAMERA_FOCUS_MAX_SECONDS, start.angleTo(normal) / Math.PI);
  let elapsed = 0;
  return {
    advance(target: THREE.Vector3, delta: number, motionEnabled: boolean) {
      elapsed += delta;
      const progress = motionEnabled ? Math.min(1, elapsed / duration) : 1;
      const eased = progress ** 3 * (progress * (progress * 6 - 15) + 10);
      interpolated.slerpQuaternions(identity, rotation, eased);
      target.copy(start).applyQuaternion(interpolated).multiplyScalar(distance);
      return progress === 1;
    }
  };
}
