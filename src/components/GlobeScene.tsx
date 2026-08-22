"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import countries from "world-atlas/countries-110m.json";
import { GLOBE_RADIUS } from "@/lib/geo";
import type { TerraPoint } from "@/lib/modes/types";

type GlobeSceneProps = {
  focusKey: string | null;
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
const TOKYO = {
  ocean: "#050509",
  land: "#3b4261",
  border: "#c0caf5",
  markerLow: "#7aa2f7",
  markerMid: "#bb9af7",
  markerHigh: "#f7768e",
  selectedMarker: "#ff9e64"
};

const MARKER_COLOR_STOPS = [
  new THREE.Color(TOKYO.markerLow),
  new THREE.Color(TOKYO.markerMid),
  new THREE.Color(TOKYO.markerHigh)
] as const;

export function GlobeScene({ focusKey, points, selectedPoint, onPointHover, onPointSelect }: GlobeSceneProps) {
  return (
    <Canvas camera={{ position: [0, 0.35, 5.2], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={[TOKYO.ocean]} />
      <ambientLight intensity={1.7} />
      <directionalLight intensity={2.4} position={[3, 2, 4]} />
      <directionalLight intensity={0.45} position={[-4, -1, -3]} />

      <Earth />
      {points.map((point) => (
        <PointMarker
          key={point.id}
          point={point}
          selected={selectedPoint?.id === point.id}
          onHover={onPointHover}
          onSelect={onPointSelect}
        />
      ))}

      <CameraFocus focusKey={focusKey} selectedPoint={selectedPoint} />
      <OrbitControls enableDamping enablePan={false} maxDistance={10} minDistance={2.15} rotateSpeed={0.55} />
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

function PointMarker({
  point,
  selected,
  onHover,
  onSelect
}: {
  point: TerraPoint;
  selected: boolean;
  onHover: (point: TerraPoint | null) => void;
  onSelect: (point: TerraPoint) => void;
}) {
  const markerRef = useRef<THREE.Group>(null);
  const severity = point.severity ?? 0.3;

  const radius = 0.012 + severity * 0.012;
  const markerColor = useMemo(() => getMarkerColor(severity), [severity]);
  const { position, quaternion } = useMemo(() => {
    const normal = latLonToVector3(point.latitude, point.longitude, 1).normalize();
    return {
      position: normal.clone().multiplyScalar(GLOBE_RADIUS * 1.003),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    };
  }, [point.latitude, point.longitude]);

  useFrame(({ camera }) => {
    if (!markerRef.current) {
      return;
    }

    const cameraDistance = camera.position.length();
    const zoomScale = THREE.MathUtils.clamp(Math.pow(cameraDistance / 5.2, 2), 0.42, 1.65);
    markerRef.current.scale.setScalar(selected ? zoomScale * 1.2 : zoomScale);
  });

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelect(point);
  }

  return (
    <group
      ref={markerRef}
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
        <circleGeometry args={[radius, 24]} />
        <meshBasicMaterial color={selected ? TOKYO.selectedMarker : markerColor} depthWrite={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[radius * 4, 24]} />
        <meshBasicMaterial color={markerColor} transparent opacity={0} depthWrite={false} />
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

function getMarkerColor(severity: number) {
  const value = THREE.MathUtils.clamp(severity, 0, 1);

  if (value < 0.5) {
    return MARKER_COLOR_STOPS[0].clone().lerp(MARKER_COLOR_STOPS[1], value / 0.5);
  }

  return MARKER_COLOR_STOPS[1].clone().lerp(MARKER_COLOR_STOPS[2], (value - 0.5) / 0.5);
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
