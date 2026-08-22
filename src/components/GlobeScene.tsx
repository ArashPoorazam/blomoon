"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { feature } from "topojson-client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import countries from "world-atlas/countries-110m.json";
import { GLOBE_RADIUS, latLonToVector3 } from "@/lib/geo";
import type { TerraPoint } from "@/lib/modes/types";

type GlobeSceneProps = {
  points: TerraPoint[];
  selectedPoint: TerraPoint | null;
  onPointSelect: (point: TerraPoint) => void;
};

export function GlobeScene({ points, selectedPoint, onPointSelect }: GlobeSceneProps) {
  return (
    <Canvas camera={{ position: [0, 0.35, 5.2], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={["#050505"]} />
      <ambientLight intensity={1.8} />
      <directionalLight intensity={2.2} position={[3, 2, 4]} />
      <directionalLight intensity={0.7} position={[-4, -1, -3]} />

      <group rotation={[0, -0.55, 0]}>
        <Earth />
        <CountryBorders />
        {points.map((point) => (
          <PointMarker
            key={point.id}
            point={point}
            selected={selectedPoint?.id === point.id}
            onSelect={onPointSelect}
          />
        ))}
      </group>

      <CameraFocus selectedPoint={selectedPoint} />
      <OrbitControls enableDamping enablePan={false} maxDistance={7} minDistance={3.2} rotateSpeed={0.55} />
    </Canvas>
  );
}

function Earth() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
        <meshStandardMaterial color="#e4e1d7" roughness={0.92} metalness={0.02} />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 1.006, 96, 96]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.045} />
      </mesh>
    </group>
  );
}

function CountryBorders() {
  const rings = useMemo(() => {
    const topology = countries as unknown as {
      objects: {
        countries: unknown;
      };
    };

    const collection = feature(countries as never, topology.objects.countries as never) as unknown as {
      features: Array<{
        geometry: {
          type: "Polygon" | "MultiPolygon";
          coordinates: number[][][] | number[][][][];
        };
      }>;
    };

    return collection.features.flatMap((item, featureIndex) => {
      const polygons =
        item.geometry.type === "Polygon"
          ? [item.geometry.coordinates as number[][][]]
          : (item.geometry.coordinates as number[][][][]);

      return polygons.flatMap((polygon, polygonIndex) =>
        polygon.map((ring, ringIndex) => ({
          key: `${featureIndex}-${polygonIndex}-${ringIndex}`,
          points: ring.map(([longitude, latitude]) => latLonToVector3(latitude, longitude, GLOBE_RADIUS * 1.008))
        }))
      );
    });
  }, []);

  return (
    <group>
      {rings.map((ring) => (
        <BorderRing key={ring.key} points={ring.points} />
      ))}
    </group>
  );
}

function BorderRing({ points }: { points: THREE.Vector3[] }) {
  const positions = useMemo(() => {
    const closedPoints = [...points, points[0]];
    return new Float32Array(closedPoints.flatMap((point) => [point.x, point.y, point.z]));
  }, [points]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#393939" transparent opacity={0.82} />
    </line>
  );
}

function PointMarker({
  point,
  selected,
  onSelect
}: {
  point: TerraPoint;
  selected: boolean;
  onSelect: (point: TerraPoint) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const severity = point.severity ?? 0.3;

  const { position, quaternion } = useMemo(() => {
    const normal = latLonToVector3(point.latitude, point.longitude, 1).normalize();
    return {
      position: normal.clone().multiplyScalar(GLOBE_RADIUS * 1.035),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    };
  }, [point.latitude, point.longitude]);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const pulse = selected ? 1.2 + Math.sin(clock.elapsedTime * 4) * 0.12 : 1;
    groupRef.current.scale.setScalar(pulse);
  });

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
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
    >
      <mesh>
        <sphereGeometry args={[0.028 + severity * 0.035, 16, 16]} />
        <meshBasicMaterial color={selected ? "#ffe08a" : "#f2c14e"} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.07 + severity * 0.05, 0.004, 8, 32]} />
        <meshBasicMaterial color="#f2c14e" transparent opacity={selected ? 0.74 : 0.28} />
      </mesh>
    </group>
  );
}

function CameraFocus({ selectedPoint }: { selectedPoint: TerraPoint | null }) {
  const target = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame(({ camera }, delta) => {
    if (!selectedPoint) {
      return;
    }

    const normal = latLonToVector3(selectedPoint.latitude, selectedPoint.longitude, 1).normalize();
    const desiredPosition = normal.multiplyScalar(4.65);
    const alpha = 1 - Math.pow(0.025, delta);

    camera.position.lerp(desiredPosition, alpha);
    camera.lookAt(target);
  });

  return null;
}
