"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { GLOBE_RADIUS } from "@/lib/geo";
import type { TerraPoint } from "@/lib/modes/types";
import { resolvePointMarkerColor, type GlobeTheme, type MarkerColorMode } from "@/lib/theme/globe";
import {
  DEFAULT_CAMERA_DISTANCE,
  MARKER_ALTITUDE,
  MARKER_RADIUS,
  getMarkerScale,
  latLonToVector3
} from "./globeMath";

type MarkerBatch = {
  color: string;
  points: TerraPoint[];
};

type MarkerTransform = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
};

type PointMarkersProps = {
  hoverEnabled: boolean;
  markerColor?: string;
  markerColorMode: MarkerColorMode;
  points: TerraPoint[];
  selectedPoint: TerraPoint | null;
  theme: GlobeTheme;
  onHover: (point: TerraPoint | null) => void;
  onSelect: (point: TerraPoint) => void;
};

const MIN_CAMERA_FACING_DOT = 0.01;

export function PointMarkers({
  hoverEnabled,
  markerColor,
  markerColorMode,
  points,
  selectedPoint,
  theme,
  onHover,
  onSelect
}: PointMarkersProps) {
  const instancedPoints = useMemo(
    () => points.filter((point) => point.id !== selectedPoint?.id),
    [points, selectedPoint?.id]
  );
  const visualBatches = useMemo(
    () => getMarkerBatches(instancedPoints, markerColorMode, markerColor ?? theme.markers.defaultSingle, theme),
    [instancedPoints, markerColor, markerColorMode, theme]
  );

  return (
    <>
      {visualBatches.map((batch) => (
        <MarkerVisualInstances
          key={batch.color}
          color={batch.color}
          points={batch.points}
        />
      ))}
      <MarkerHitInstances
        hoverEnabled={hoverEnabled}
        points={instancedPoints}
        onHover={onHover}
        onSelect={onSelect}
      />
      {selectedPoint ? (
        <SelectedPointMarker
          point={selectedPoint}
          theme={theme}
          hoverEnabled={hoverEnabled}
          onHover={onHover}
          onSelect={onSelect}
        />
      ) : null}
    </>
  );
}

function MarkerVisualInstances({ color, points }: { color: string; points: TerraPoint[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const instanceCapacity = useMemo(() => getInstanceCapacity(points.length), [points.length]);

  useScaledMarkerInstances(meshRef, points);

  if (points.length === 0) {
    return null;
  }

  return (
    <instancedMesh
      key={instanceCapacity}
      ref={meshRef}
      args={[undefined, undefined, instanceCapacity]}
      frustumCulled={false}
    >
      <circleGeometry args={[MARKER_RADIUS, 18]} />
      <meshBasicMaterial color={color} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}

function MarkerHitInstances({
  hoverEnabled,
  points,
  onHover,
  onSelect
}: {
  hoverEnabled: boolean;
  points: TerraPoint[];
  onHover: (point: TerraPoint | null) => void;
  onSelect: (point: TerraPoint) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const camera = useThree((state) => state.camera);
  const hoveredPointId = useRef<string | null>(null);
  const instanceCapacity = useMemo(() => getInstanceCapacity(points.length), [points.length]);
  const markerNormals = useMemo(
    () => points.map((point) => latLonToVector3(point.latitude, point.longitude, 1).normalize()),
    [points]
  );

  useScaledMarkerInstances(meshRef, points);

  function getPointFromEvent(event: ThreeEvent<PointerEvent | MouseEvent>) {
    const instanceId = event.instanceId;
    return typeof instanceId === "number" ? points[instanceId] ?? null : null;
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (!hoverEnabled) {
      return;
    }

    const point = getPointFromEvent(event);
    const normal = typeof event.instanceId === "number" ? markerNormals[event.instanceId] : null;

    if (!point || !normal || !isMarkerFacingCamera(normal, camera)) {
      clearHover();
      return;
    }

    if (hoveredPointId.current === point.id) {
      return;
    }

    event.stopPropagation();
    hoveredPointId.current = point.id;
    document.body.style.cursor = "pointer";
    onHover(point);
  }

  function clearHover() {
    hoveredPointId.current = null;
    document.body.style.cursor = "";
    onHover(null);
  }

  function handlePointerOut() {
    if (!hoverEnabled) {
      return;
    }

    clearHover();
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    const point = getPointFromEvent(event);
    const normal = typeof event.instanceId === "number" ? markerNormals[event.instanceId] : null;

    if (!point || !normal || !isMarkerFacingCamera(normal, camera)) {
      return;
    }

    event.stopPropagation();
    onSelect(point);
  }

  if (points.length === 0) {
    return null;
  }

  return (
    <instancedMesh
      key={instanceCapacity}
      ref={meshRef}
      args={[undefined, undefined, instanceCapacity]}
      frustumCulled={false}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
    >
      <circleGeometry args={[MARKER_RADIUS * 4.5, 12]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

function SelectedPointMarker({
  hoverEnabled,
  point,
  theme,
  onHover,
  onSelect
}: {
  hoverEnabled: boolean;
  point: TerraPoint;
  theme: GlobeTheme;
  onHover: (point: TerraPoint | null) => void;
  onSelect: (point: TerraPoint) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const camera = useThree((state) => state.camera);
  const { normal, position, quaternion } = useMemo(() => {
    const normal = latLonToVector3(point.latitude, point.longitude, 1).normalize();
    return {
      normal,
      position: normal.clone().multiplyScalar(GLOBE_RADIUS * MARKER_ALTITUDE),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    };
  }, [point.latitude, point.longitude]);

  useScaledMarkerGroup(groupRef);

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (!isMarkerFacingCamera(normal, camera)) {
      return;
    }

    event.stopPropagation();
    onSelect(point);
  }

  return (
    <group
      ref={groupRef}
      position={position}
      quaternion={quaternion}
      onClick={handleClick}
      onPointerOut={() => {
        if (!hoverEnabled) {
          return;
        }

        document.body.style.cursor = "";
        onHover(null);
      }}
      onPointerOver={(event) => {
        if (!hoverEnabled) {
          return;
        }

        if (!isMarkerFacingCamera(normal, camera)) {
          return;
        }

        event.stopPropagation();
        document.body.style.cursor = "pointer";
        onHover(point);
      }}
    >
      <mesh>
        <circleGeometry args={[MARKER_RADIUS * 1.15, 24]} />
        <meshBasicMaterial color={theme.markers.selected} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[MARKER_RADIUS * 2.05, MARKER_RADIUS * 3.05, 32]} />
        <meshBasicMaterial
          color={theme.markers.selectedRing}
          depthWrite={false}
          opacity={0.86}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent
        />
      </mesh>
      <mesh>
        <circleGeometry args={[MARKER_RADIUS * 4.5, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function useScaledMarkerInstances(meshRef: RefObject<THREE.InstancedMesh | null>, points: TerraPoint[]) {
  const markerScale = useRef(getMarkerScale(DEFAULT_CAMERA_DISTANCE));
  const transforms = useMemo(() => getMarkerTransforms(points), [points]);
  const tempObject = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    writeMarkerInstances(meshRef.current, transforms, markerScale.current, tempObject);
  }, [meshRef, tempObject, transforms]);

  useFrame(({ camera }) => {
    const nextScale = getMarkerScale(camera.position.length());

    if (Math.abs(nextScale - markerScale.current) < 0.005) {
      return;
    }

    markerScale.current = nextScale;
    writeMarkerInstances(meshRef.current, transforms, markerScale.current, tempObject);
  });
}

function useScaledMarkerGroup(groupRef: RefObject<THREE.Group | null>) {
  const markerScale = useRef(getMarkerScale(DEFAULT_CAMERA_DISTANCE));

  useLayoutEffect(() => {
    groupRef.current?.scale.setScalar(markerScale.current);
  }, [groupRef]);

  useFrame(({ camera }) => {
    const nextScale = getMarkerScale(camera.position.length());

    if (Math.abs(nextScale - markerScale.current) < 0.005) {
      return;
    }

    markerScale.current = nextScale;
    groupRef.current?.scale.setScalar(markerScale.current);
  });
}

function writeMarkerInstances(
  mesh: THREE.InstancedMesh | null,
  transforms: MarkerTransform[],
  markerScale: number,
  tempObject: THREE.Object3D
) {
  if (!mesh) {
    return;
  }

  transforms.forEach((transform, index) => {
    tempObject.position.copy(transform.position);
    tempObject.quaternion.copy(transform.quaternion);
    tempObject.scale.setScalar(markerScale);
    tempObject.updateMatrix();

    mesh.setMatrixAt(index, tempObject.matrix);
  });

  mesh.count = transforms.length;
  mesh.instanceMatrix.needsUpdate = true;
}

function getMarkerTransforms(points: TerraPoint[]): MarkerTransform[] {
  const normal = new THREE.Vector3();
  const outward = new THREE.Vector3(0, 0, 1);

  return points.map((point) => {
    normal.copy(latLonToVector3(point.latitude, point.longitude, 1)).normalize();

    return {
      position: normal.clone().multiplyScalar(GLOBE_RADIUS * MARKER_ALTITUDE),
      quaternion: new THREE.Quaternion().setFromUnitVectors(outward, normal)
    };
  });
}

function isMarkerFacingCamera(normal: THREE.Vector3, camera: THREE.Camera) {
  return normal.dot(camera.position.clone().normalize()) > MIN_CAMERA_FACING_DOT;
}

function getMarkerBatches(
  points: TerraPoint[],
  markerColorMode: MarkerColorMode,
  singleColor: string,
  theme: GlobeTheme
) {
  const batches = new Map<string, TerraPoint[]>();

  points.forEach((point) => {
    const color = resolvePointMarkerColor(point, markerColorMode, singleColor, theme);
    const batch = batches.get(color);

    if (batch) {
      batch.push(point);
      return;
    }

    batches.set(color, [point]);
  });

  return Array.from(batches, ([color, batchPoints]) => ({
    color,
    points: batchPoints
  } satisfies MarkerBatch));
}

function getInstanceCapacity(count: number) {
  if (count <= 1) {
    return 1;
  }

  return 2 ** Math.ceil(Math.log2(count));
}
