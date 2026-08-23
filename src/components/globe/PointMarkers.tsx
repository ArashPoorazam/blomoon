"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
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

type PointMarkersProps = {
  markerColor?: string;
  markerColorMode: MarkerColorMode;
  points: TerraPoint[];
  selectedPoint: TerraPoint | null;
  theme: GlobeTheme;
  onHover: (point: TerraPoint | null) => void;
  onSelect: (point: TerraPoint) => void;
};

export function PointMarkers({
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
        points={instancedPoints}
        onHover={onHover}
        onSelect={onSelect}
      />
      {selectedPoint ? (
        <SelectedPointMarker
          point={selectedPoint}
          theme={theme}
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
  points,
  onHover,
  onSelect
}: {
  points: TerraPoint[];
  onHover: (point: TerraPoint | null) => void;
  onSelect: (point: TerraPoint) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hoveredPointId = useRef<string | null>(null);
  const instanceCapacity = useMemo(() => getInstanceCapacity(points.length), [points.length]);

  useScaledMarkerInstances(meshRef, points);

  function getPointFromEvent(event: ThreeEvent<PointerEvent | MouseEvent>) {
    const instanceId = event.instanceId;
    return typeof instanceId === "number" ? points[instanceId] ?? null : null;
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    const point = getPointFromEvent(event);

    if (!point || hoveredPointId.current === point.id) {
      return;
    }

    event.stopPropagation();
    hoveredPointId.current = point.id;
    document.body.style.cursor = "pointer";
    onHover(point);
  }

  function handlePointerOut() {
    hoveredPointId.current = null;
    document.body.style.cursor = "";
    onHover(null);
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    const point = getPointFromEvent(event);

    if (!point) {
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
  point,
  theme,
  onHover,
  onSelect
}: {
  point: TerraPoint;
  theme: GlobeTheme;
  onHover: (point: TerraPoint | null) => void;
  onSelect: (point: TerraPoint) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { position, quaternion } = useMemo(() => {
    const normal = latLonToVector3(point.latitude, point.longitude, 1).normalize();
    return {
      position: normal.clone().multiplyScalar(GLOBE_RADIUS * MARKER_ALTITUDE),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    };
  }, [point.latitude, point.longitude]);

  useScaledMarkerGroup(groupRef);

  function handleClick(event: ThreeEvent<MouseEvent>) {
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
        document.body.style.cursor = "";
        onHover(null);
      }}
      onPointerOver={(event) => {
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

  useLayoutEffect(() => {
    writeMarkerInstances(meshRef.current, points, markerScale.current);
  }, [meshRef, points]);

  useFrame(({ camera }) => {
    const nextScale = getMarkerScale(camera.position.length());

    if (Math.abs(nextScale - markerScale.current) < 0.005) {
      return;
    }

    markerScale.current = nextScale;
    writeMarkerInstances(meshRef.current, points, markerScale.current);
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

function writeMarkerInstances(mesh: THREE.InstancedMesh | null, points: TerraPoint[], markerScale: number) {
  if (!mesh) {
    return;
  }

  const temp = new THREE.Object3D();
  const normal = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const markerPosition = new THREE.Vector3();
  const outward = new THREE.Vector3(0, 0, 1);

  points.forEach((point, index) => {
    normal.copy(latLonToVector3(point.latitude, point.longitude, 1)).normalize();
    markerPosition.copy(normal).multiplyScalar(GLOBE_RADIUS * MARKER_ALTITUDE);
    quaternion.setFromUnitVectors(outward, normal);

    temp.position.copy(markerPosition);
    temp.quaternion.copy(quaternion);
    temp.scale.setScalar(markerScale);
    temp.updateMatrix();

    mesh.setMatrixAt(index, temp.matrix);
  });

  mesh.count = points.length;
  mesh.instanceMatrix.needsUpdate = true;
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
