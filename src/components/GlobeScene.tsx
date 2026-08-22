"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import countries from "world-atlas/countries-110m.json";
import { GLOBE_RADIUS } from "@/lib/geo";
import type { TerraPoint } from "@/lib/modes/types";

type GlobeSceneProps = {
  focusKey: string | null;
  markerColor?: string;
  markerColorMode: "severity" | "single";
  points: TerraPoint[];
  selectedPoint: TerraPoint | null;
  onPointHover: (point: TerraPoint | null) => void;
  onPointSelect: (point: TerraPoint) => void;
};

type RingCoordinates = number[][];
type PolygonCoordinates = RingCoordinates[];
type MultiPolygonCoordinates = PolygonCoordinates[];
type BorderLineCoordinates = number[][];
type BorderMesh = {
  type: "MultiLineString";
  coordinates: BorderLineCoordinates[];
};
type CountryCollection = {
  type: "FeatureCollection";
  features: CountryFeature[];
};

type CountryFeature = {
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: PolygonCoordinates | MultiPolygonCoordinates;
  };
};

const DEG_TO_RAD = Math.PI / 180;
const MIN_CAMERA_DISTANCE = 2.15;
const DEFAULT_CAMERA_DISTANCE = 5.2;
const MAX_CAMERA_DISTANCE = 10;
const MIN_ROTATE_SPEED = 0.18;
const DEFAULT_ROTATE_SPEED = 0.55;
const MAX_ROTATE_SPEED = 0.7;
const MARKER_RADIUS = 0.0072;
const MARKER_ALTITUDE = 1.001;
const TOKYO = {
  ocean: "#050509",
  land: "#3b4261",
  border: "#c0caf5",
  markerLow: "#7aa2f7",
  markerMid: "#bb9af7",
  markerHigh: "#f7768e",
  selectedMarker: "#ff9e64",
  selectedRing: "#ffffff"
};

const MARKER_COLOR_STOPS = [
  new THREE.Color(TOKYO.markerLow),
  new THREE.Color(TOKYO.markerMid),
  new THREE.Color(TOKYO.markerHigh)
] as const;

export function GlobeScene({
  focusKey,
  markerColor,
  markerColorMode,
  points,
  selectedPoint,
  onPointHover,
  onPointSelect
}: GlobeSceneProps) {
  return (
    <Canvas camera={{ position: [0, 0.35, 5.2], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={[TOKYO.ocean]} />
      <ambientLight intensity={1.7} />
      <directionalLight intensity={2.4} position={[3, 2, 4]} />
      <directionalLight intensity={0.45} position={[-4, -1, -3]} />

      <Earth />
      <PointMarkers
        markerColor={markerColor}
        markerColorMode={markerColorMode}
        points={points}
        selectedPoint={selectedPoint}
        onHover={onPointHover}
        onSelect={onPointSelect}
      />

      <CameraFocus focusKey={focusKey} selectedPoint={selectedPoint} />
      <AdaptiveOrbitControls />
    </Canvas>
  );
}

function Earth() {
  const texture = useMemo(() => createEarthTexture(), []);

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
      <meshStandardMaterial map={texture} roughness={0.96} metalness={0.01} />
    </mesh>
  );
}

function PointMarkers({
  markerColor,
  markerColorMode,
  points,
  selectedPoint,
  onHover,
  onSelect
}: {
  markerColor?: string;
  markerColorMode: "severity" | "single";
  points: TerraPoint[];
  selectedPoint: TerraPoint | null;
  onHover: (point: TerraPoint | null) => void;
  onSelect: (point: TerraPoint) => void;
}) {
  const visualRef = useRef<THREE.InstancedMesh>(null);
  const hitRef = useRef<THREE.InstancedMesh>(null);
  const hoveredPointId = useRef<string | null>(null);
  const pointsByInstance = useRef<TerraPoint[]>([]);
  const instancedPoints = useMemo(
    () => points.filter((point) => point.id !== selectedPoint?.id),
    [points, selectedPoint?.id]
  );
  const singleColor = useMemo(() => new THREE.Color(markerColor ?? "#ffffff"), [markerColor]);

  useLayoutEffect(() => {
    const visualMesh = visualRef.current;
    const hitMesh = hitRef.current;

    if (!visualMesh || !hitMesh) {
      return;
    }

    pointsByInstance.current = instancedPoints;
    const temp = new THREE.Object3D();
    const normal = new THREE.Vector3();
    const color = new THREE.Color();
    const quaternion = new THREE.Quaternion();
    const markerPosition = new THREE.Vector3();
    const outward = new THREE.Vector3(0, 0, 1);

    instancedPoints.forEach((point, index) => {
      normal.copy(latLonToVector3(point.latitude, point.longitude, 1)).normalize();
      markerPosition.copy(normal).multiplyScalar(GLOBE_RADIUS * MARKER_ALTITUDE);
      quaternion.setFromUnitVectors(outward, normal);

      temp.position.copy(markerPosition);
      temp.quaternion.copy(quaternion);
      temp.scale.setScalar(1);
      temp.updateMatrix();

      visualMesh.setMatrixAt(index, temp.matrix);
      hitMesh.setMatrixAt(index, temp.matrix);
      visualMesh.setColorAt(index, writePointColor(point, markerColorMode, singleColor, color));
    });

    visualMesh.count = instancedPoints.length;
    hitMesh.count = instancedPoints.length;
    visualMesh.instanceMatrix.needsUpdate = true;
    hitMesh.instanceMatrix.needsUpdate = true;

    if (visualMesh.instanceColor) {
      visualMesh.instanceColor.needsUpdate = true;
    }
  }, [instancedPoints, markerColorMode, singleColor]);

  function getPointFromEvent(event: ThreeEvent<PointerEvent | MouseEvent>) {
    const instanceId = event.instanceId;
    return typeof instanceId === "number" ? pointsByInstance.current[instanceId] ?? null : null;
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

  return (
    <>
      <instancedMesh ref={visualRef} args={[undefined, undefined, instancedPoints.length]} frustumCulled={false}>
        <circleGeometry args={[MARKER_RADIUS, 18]} />
        <meshBasicMaterial depthWrite={false} side={THREE.DoubleSide} toneMapped={false} vertexColors />
      </instancedMesh>
      <instancedMesh
        ref={hitRef}
        args={[undefined, undefined, instancedPoints.length]}
        frustumCulled={false}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <circleGeometry args={[MARKER_RADIUS * 4.5, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </instancedMesh>
      {selectedPoint ? (
        <SelectedPointMarker
          point={selectedPoint}
          onHover={onHover}
          onSelect={onSelect}
        />
      ) : null}
    </>
  );
}

function SelectedPointMarker({
  point,
  onHover,
  onSelect
}: {
  point: TerraPoint;
  onHover: (point: TerraPoint | null) => void;
  onSelect: (point: TerraPoint) => void;
}) {
  const { position, quaternion } = useMemo(() => {
    const normal = latLonToVector3(point.latitude, point.longitude, 1).normalize();
    return {
      position: normal.clone().multiplyScalar(GLOBE_RADIUS * MARKER_ALTITUDE),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    };
  }, [point.latitude, point.longitude]);

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelect(point);
  }

  return (
    <group
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
        <meshBasicMaterial color={TOKYO.selectedMarker} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[MARKER_RADIUS * 2.05, MARKER_RADIUS * 3.05, 32]} />
        <meshBasicMaterial
          color={TOKYO.selectedRing}
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

function CameraFocus({ focusKey, selectedPoint }: { focusKey: string | null; selectedPoint: TerraPoint | null }) {
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

function AdaptiveOrbitControls() {
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

function createEarthTexture() {
  const width = 4096;
  const height = 2048;

  if (typeof document === "undefined") {
    return new THREE.Texture();
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.fillStyle = TOKYO.ocean;
  context.fillRect(0, 0, width, height);

  const projection = geoEquirectangular()
    .translate([width / 2, height / 2])
    .scale(width / (2 * Math.PI))
    .precision(0.2);
  const path = geoPath(projection, context);

  context.fillStyle = TOKYO.land;
  context.beginPath();
  path(getCountryCollection() as never);
  context.fill("evenodd");

  drawCountryBorders(context, path);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 12;
  return texture;
}

function drawCountryBorders(context: CanvasRenderingContext2D, path: ReturnType<typeof geoPath>) {
  context.strokeStyle = TOKYO.border;
  context.lineWidth = 1.45;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  path(getCountryBorderMesh() as never);
  context.stroke();
}

function getCountryCollection() {
  const topology = countries as unknown as {
    objects: {
      countries: unknown;
    };
  };

  const collection = feature(countries as never, topology.objects.countries as never) as unknown as {
    features: CountryFeature[];
  };

  return {
    type: "FeatureCollection",
    features: collection.features
  } satisfies CountryCollection;
}

function getCountryBorderMesh() {
  const topology = countries as unknown as {
    objects: {
      countries: unknown;
    };
  };

  const borderMesh = mesh(countries as never, topology.objects.countries as never) as unknown as BorderMesh;
  return borderMesh;
}

function writeMarkerColor(severity: number, target: THREE.Color) {
  const value = THREE.MathUtils.clamp(severity, 0, 1);

  if (value < 0.5) {
    return target.copy(MARKER_COLOR_STOPS[0]).lerp(MARKER_COLOR_STOPS[1], value / 0.5);
  }

  return target.copy(MARKER_COLOR_STOPS[1]).lerp(MARKER_COLOR_STOPS[2], (value - 0.5) / 0.5);
}

function writePointColor(
  point: TerraPoint,
  markerColorMode: "severity" | "single",
  singleColor: THREE.Color,
  target: THREE.Color
) {
  if (markerColorMode === "single") {
    return target.copy(singleColor);
  }

  return writeMarkerColor(point.severity ?? 0.3, target);
}

function getRotateSpeed(cameraDistance: number) {
  if (cameraDistance <= DEFAULT_CAMERA_DISTANCE) {
    const value = smoothProgress(MIN_CAMERA_DISTANCE, DEFAULT_CAMERA_DISTANCE, cameraDistance);
    return THREE.MathUtils.lerp(MIN_ROTATE_SPEED, DEFAULT_ROTATE_SPEED, value);
  }

  const value = smoothProgress(DEFAULT_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, cameraDistance);
  return THREE.MathUtils.lerp(DEFAULT_ROTATE_SPEED, MAX_ROTATE_SPEED, value);
}

function smoothProgress(minimum: number, maximum: number, value: number) {
  const progress = THREE.MathUtils.clamp((value - minimum) / (maximum - minimum), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function latLonToVector3(latitude: number, longitude: number, radius = GLOBE_RADIUS) {
  const phi = (90 - latitude) * DEG_TO_RAD;
  const theta = (longitude + 180) * DEG_TO_RAD;

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}
