import type * as GeoJSON from "geojson";

const GLOBE_RENDER_SIMPLIFICATION_TOLERANCE = 0.08;
const GLOBE_RENDER_SIMPLIFICATION_TOLERANCE_SQUARED =
  GLOBE_RENDER_SIMPLIFICATION_TOLERANCE * GLOBE_RENDER_SIMPLIFICATION_TOLERANCE;

export function simplifyPolygonFeature<
  Feature extends GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
>(feature: Feature): Feature {
  return {
    ...feature,
    geometry: simplifyPolygonGeometry(feature.geometry)
  };
}

export function simplifyMultiLineString(multiline: GeoJSON.MultiLineString): GeoJSON.MultiLineString {
  return {
    ...multiline,
    coordinates: multiline.coordinates.flatMap((line) =>
      splitLineAtAntimeridian(line).map(simplifyLine)
    )
  };
}

function simplifyPolygonGeometry(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): GeoJSON.Polygon | GeoJSON.MultiPolygon {
  if (geometry.type === "Polygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map(simplifyRing)
    };
  }

  return {
    ...geometry,
    coordinates: geometry.coordinates.map((polygon) => polygon.map(simplifyRing))
  };
}

function simplifyRing(ring: GeoJSON.Position[]): GeoJSON.Position[] {
  if (ring.length < 24) {
    return ring.map(clonePosition);
  }

  const closed = positionsEqual(ring[0], ring[ring.length - 1]);
  const source = closed ? ring.slice(0, -1) : ring;
  const simplified = simplifyByDistance(source);

  if (simplified.length < 3) {
    return ring.map(clonePosition);
  }

  return closeRing(simplified);
}

function simplifyLine(line: GeoJSON.Position[]): GeoJSON.Position[] {
  if (line.length <= 3) {
    return line.map(clonePosition);
  }

  const keep = new Uint8Array(line.length);
  keep[0] = 1;
  keep[line.length - 1] = 1;
  simplifyLineRange(line, 0, line.length - 1, keep);

  return line.filter((_, index) => keep[index]).map(clonePosition);
}

function simplifyLineRange(
  line: GeoJSON.Position[],
  startIndex: number,
  endIndex: number,
  keep: Uint8Array
) {
  let maxDistanceSquared = 0;
  let maxDistanceIndex = 0;
  const start = line[startIndex];
  const end = line[endIndex];

  if (!start || !end) {
    return;
  }

  for (let index = startIndex + 1; index < endIndex; index += 1) {
    const point = line[index];

    if (!point) {
      continue;
    }

    const distanceSquared = getSegmentDistanceSquared(point, start, end);

    if (distanceSquared > maxDistanceSquared) {
      maxDistanceSquared = distanceSquared;
      maxDistanceIndex = index;
    }
  }

  if (maxDistanceSquared <= GLOBE_RENDER_SIMPLIFICATION_TOLERANCE_SQUARED) {
    return;
  }

  keep[maxDistanceIndex] = 1;
  simplifyLineRange(line, startIndex, maxDistanceIndex, keep);
  simplifyLineRange(line, maxDistanceIndex, endIndex, keep);
}

function simplifyByDistance(line: GeoJSON.Position[]) {
  const simplified: GeoJSON.Position[] = [];
  let previous: GeoJSON.Position | null = null;

  line.forEach((point) => {
    if (!previous || getDistanceSquared(point, previous) >= GLOBE_RENDER_SIMPLIFICATION_TOLERANCE_SQUARED) {
      const nextPoint = clonePosition(point);
      simplified.push(nextPoint);
      previous = nextPoint;
    }
  });

  return simplified;
}

function splitLineAtAntimeridian(line: GeoJSON.Position[]) {
  const lines: GeoJSON.Position[][] = [];
  let currentLine: GeoJSON.Position[] = [];

  line.forEach((point) => {
    const previous = currentLine[currentLine.length - 1];

    if (previous && crossesAntimeridian(previous, point)) {
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

function closeRing(ring: GeoJSON.Position[]) {
  const first = ring[0];
  const last = ring[ring.length - 1];

  if (!first) {
    return [];
  }

  return positionsEqual(first, last)
    ? ring.map(clonePosition)
    : [...ring.map(clonePosition), clonePosition(first)];
}

function getSegmentDistanceSquared(point: GeoJSON.Position, start: GeoJSON.Position, end: GeoJSON.Position) {
  const startX = start[0] ?? 0;
  const startY = start[1] ?? 0;
  const deltaX = (end[0] ?? 0) - startX;
  const deltaY = (end[1] ?? 0) - startY;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;

  if (lengthSquared === 0) {
    return getDistanceSquared(point, start);
  }

  const rawPosition = (((point[0] ?? 0) - startX) * deltaX + ((point[1] ?? 0) - startY) * deltaY) / lengthSquared;
  const position = Math.max(0, Math.min(1, rawPosition));
  const projectedX = startX + position * deltaX;
  const projectedY = startY + position * deltaY;
  const distanceX = (point[0] ?? 0) - projectedX;
  const distanceY = (point[1] ?? 0) - projectedY;

  return distanceX * distanceX + distanceY * distanceY;
}

function getDistanceSquared(a: GeoJSON.Position, b: GeoJSON.Position) {
  const deltaX = (a[0] ?? 0) - (b[0] ?? 0);
  const deltaY = (a[1] ?? 0) - (b[1] ?? 0);

  return deltaX * deltaX + deltaY * deltaY;
}

function positionsEqual(a?: GeoJSON.Position, b?: GeoJSON.Position) {
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
}

function crossesAntimeridian(a: GeoJSON.Position, b: GeoJSON.Position) {
  return Math.abs((a[0] ?? 0) - (b[0] ?? 0)) > 180;
}

function clonePosition(position: GeoJSON.Position): GeoJSON.Position {
  return [position[0] ?? 0, position[1] ?? 0];
}
