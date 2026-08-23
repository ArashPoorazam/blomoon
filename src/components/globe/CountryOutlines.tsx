"use client";

import { Line } from "@react-three/drei";
import type * as GeoJSON from "geojson";
import { useMemo } from "react";
import * as THREE from "three";
import { GLOBE_RADIUS, getCountryBorderMesh, getCountryOutlineLines, isValidCoordinatePair } from "@/lib/geo";
import type { GlobeTheme } from "@/lib/theme/globe";
import { latLonToVector3 } from "./globeMath";

const BORDER_ALTITUDE = 1.0018;
const SELECTED_OUTLINE_ALTITUDE = 1.0032;
const surfaceLineSegmentsCache = new Map<string, THREE.Vector3[]>();

type CountryOutlinesProps = {
  selectedCountryCode: string | null;
  selectedOutlineColor: string;
  theme: GlobeTheme;
};

export function CountryOutlines({
  selectedCountryCode,
  selectedOutlineColor,
  theme
}: CountryOutlinesProps) {
  const borderSegments = useMemo(
    () => getCachedSurfaceLineSegments("borders", getCountryBorderMesh(), GLOBE_RADIUS * BORDER_ALTITUDE),
    []
  );
  const selectedSegments = useMemo(() => {
    const outline = getCountryOutlineLines(selectedCountryCode);
    return outline
      ? getCachedSurfaceLineSegments(`selected:${selectedCountryCode}`, outline, GLOBE_RADIUS * SELECTED_OUTLINE_ALTITUDE)
      : [];
  }, [selectedCountryCode]);

  return (
    <>
      <Line
        color={theme.border}
        depthWrite={false}
        lineWidth={theme.borderLineWidth}
        opacity={theme.borderOpacity}
        points={borderSegments}
        segments
        toneMapped={false}
        transparent
      />
      {selectedSegments.length > 0 ? (
        <Line
          color={selectedOutlineColor}
          depthWrite={false}
          lineWidth={theme.selectedCountryOutlineWidth}
          opacity={theme.selectedCountryOutlineOpacity}
          points={selectedSegments}
          segments
          toneMapped={false}
          transparent
        />
      ) : null}
    </>
  );
}

function getCachedSurfaceLineSegments(key: string, multiline: GeoJSON.MultiLineString, radius: number) {
  const cachedSegments = surfaceLineSegmentsCache.get(key);

  if (cachedSegments) {
    return cachedSegments;
  }

  const segments = getSurfaceLineSegments(multiline, radius);
  surfaceLineSegmentsCache.set(key, segments);
  return segments;
}

function getSurfaceLineSegments(multiline: GeoJSON.MultiLineString, radius: number) {
  const segments: THREE.Vector3[] = [];

  multiline.coordinates.forEach((line) => {
    splitLineAtAntimeridian(line).forEach((part) => {
      for (let index = 1; index < part.length; index += 1) {
        const start = part[index - 1];
        const end = part[index];

        if (start && end) {
          segments.push(positionToVector(start, radius), positionToVector(end, radius));
        }
      }
    });
  });

  return segments;
}

function splitLineAtAntimeridian(line: GeoJSON.Position[]) {
  const lines: GeoJSON.Position[][] = [];
  let currentLine: GeoJSON.Position[] = [];

  line.forEach((point) => {
    if (!isValidPosition(point)) {
      return;
    }

    const previous = currentLine[currentLine.length - 1];

    if (previous && Math.abs((previous[0] ?? 0) - (point[0] ?? 0)) > 180) {
      if (currentLine.length > 1) {
        lines.push(currentLine);
      }

      currentLine = [];
    }

    currentLine.push(point);
  });

  if (currentLine.length > 1) {
    lines.push(currentLine);
  }

  return lines;
}

function positionToVector(position: GeoJSON.Position, radius: number) {
  return latLonToVector3(position[1] ?? 0, position[0] ?? 0, radius);
}

function isValidPosition(position: GeoJSON.Position) {
  return isValidCoordinatePair(position[1] ?? Number.NaN, position[0] ?? Number.NaN);
}
