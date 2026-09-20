"use client";

import { useMemo } from "react";
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
    () => uniquePoints(showListedOnGlobe ? [...modeGlobePoints, ...listedPoints] : modeGlobePoints),
    [listedPoints, modeGlobePoints, showListedOnGlobe]
  );
  const selectedPoint = modeSelectedPoint;
  const markerColor = defaultMarkerColor;
  const markerColorMode = activeMode.markerColorMode;
  const selectedCountryOutlineColor = selectedPoint
    ? resolvePointMarkerColor(selectedPoint, markerColorMode, markerColor, activeTheme.globe)
    : defaultMarkerColor;

  return {
    activePlaybackPoint,
    markerColor,
    markerColorMode,
    points,
    selectedCountryOutlineColor,
    selectedPoint
  };
}
