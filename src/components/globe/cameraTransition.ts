import * as THREE from "three";

export const CAMERA_FOCUS_DURATION_SECONDS = 0.45;

/** Quaternion interpolation keeps the camera outside the globe, including antipodes. */
export function createCameraTransition(position: THREE.Vector3, normal: THREE.Vector3) {
  const start = position.clone().normalize();
  const rotation = new THREE.Quaternion().setFromUnitVectors(start, normal);
  const interpolated = new THREE.Quaternion();
  const identity = new THREE.Quaternion();
  const distance = position.length();
  let elapsed = 0;
  return {
    advance(target: THREE.Vector3, delta: number, motionEnabled: boolean) {
      elapsed += delta;
      const progress = motionEnabled ? Math.min(1, elapsed / CAMERA_FOCUS_DURATION_SECONDS) : 1;
      const eased = progress * progress * (3 - 2 * progress);
      interpolated.slerpQuaternions(identity, rotation, eased);
      target.copy(start).applyQuaternion(interpolated).multiplyScalar(distance);
      return progress === 1;
    }
  };
}
