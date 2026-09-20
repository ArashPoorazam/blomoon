"use client";

import { useMemo } from "react";
import { getPointKey } from "@/lib/modes/pointKeys";
import { uniquePoints } from "@/lib/modes/pointCollections";
import type { TerraMode, TerraPoint } from "@/lib/modes/types";
import { resolvePointMarkerColor } from "@/lib/theme/globe";
import {
  resolveMarkerColor,
  type TerraTheme
} from "@/lib/theme/themes";

type DisplayedGlobePointsParams = {
  activeMode: TerraMode;
  activePlaybackPoint: TerraPoint | null;
  activeTheme: TerraTheme;
  listedPoints: TerraPoint[];
  modeGlobePoints: TerraPoint[];
  modeSelectedPoint: TerraPoint | null;
  showListedOnGlobe: boolean;
};

export function useDisplayedGlobePoints({
  activeMode,
  activePlaybackPoint,
  activeTheme,
  listedPoints,
  modeGlobePoints,
  modeSelectedPoint,
  showListedOnGlobe
}: DisplayedGlobePointsParams) {
  const defaultMarkerColor = resolveMarkerColor(activeTheme, activeMode.markerColorToken)
    ?? activeTheme.globe.markers.defaultSingle;
  // The mode dataset already owns baseline coverage; never cap it again here.
  const points = useMemo(
    () => uniquePoints(showListedOnGlobe ? listedPoints : modeGlobePoints),
    [listedPoints, modeGlobePoints, showListedOnGlobe]
  );
  const listedKeys = useMemo(() => new Set(listedPoints.map(getPointKey)), [listedPoints]);
  const selectedPoint = !showListedOnGlobe || (modeSelectedPoint && listedKeys.has(getPointKey(modeSelectedPoint)))
    ? modeSelectedPoint : null;
  const visiblePlaybackPoint = !showListedOnGlobe || (activePlaybackPoint && listedKeys.has(getPointKey(activePlaybackPoint)))
    ? activePlaybackPoint : null;
  const markerColor = showListedOnGlobe ? activeTheme.globe.markers.listed : defaultMarkerColor;
  const markerColorMode = showListedOnGlobe ? "single" : activeMode.markerColorMode;
  const selectedCountryOutlineColor = selectedPoint
    ? resolvePointMarkerColor(selectedPoint, markerColorMode, markerColor, activeTheme.globe)
    : defaultMarkerColor;

  return {
    activePlaybackPoint: visiblePlaybackPoint,
    markerColor,
    markerColorMode,
    points,
    selectedCountryOutlineColor,
    selectedPoint
  };
}
