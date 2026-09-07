"use client";

import { useMemo } from "react";
import { limitGlobePoints } from "@/lib/modes/displayBudget";
import { getPointKey } from "@/lib/modes/pointKeys";
import { uniquePoints } from "@/lib/modes/pointCollections";
import type { TerraMode, TerraPoint } from "@/lib/modes/types";
import { resolvePointMarkerColor } from "@/lib/theme/globe";
import {
  resolveMarkerColor,
  type TerraTheme
} from "@/lib/theme/themes";
import type { GlobeProfile } from "./useGlobeProfile";

type DisplayedGlobePointsParams = {
  activeMode: TerraMode;
  activePlaybackPoint: TerraPoint | null;
  activeTheme: TerraTheme;
  drawerListsPoints: boolean;
  listedPoints: TerraPoint[];
  globeProfile: GlobeProfile;
  modeGlobePoints: TerraPoint[];
  modeSelectedId: string | null;
  modeSelectedPoint: TerraPoint | null;
  modeVisiblePoints: TerraPoint[];
  showListedOnGlobe: boolean;
};

export function useDisplayedGlobePoints({
  activeMode,
  activePlaybackPoint,
  activeTheme,
  drawerListsPoints,
  listedPoints,
  globeProfile,
  modeGlobePoints,
  modeSelectedId,
  modeSelectedPoint,
  modeVisiblePoints,
  showListedOnGlobe
}: DisplayedGlobePointsParams) {
  const defaultMarkerColor = resolveMarkerColor(activeTheme, activeMode.markerColorToken)
    ?? activeTheme.globe.markers.defaultSingle;
  const activeDrawerPoints = drawerListsPoints && !modeSelectedId ? listedPoints : modeVisiblePoints;
  const defaultGlobePoints = useMemo(
    () => uniquePoints([...modeGlobePoints, ...activeDrawerPoints]),
    [activeDrawerPoints, modeGlobePoints]
  );
  const rawGlobePoints = showListedOnGlobe ? activeDrawerPoints : defaultGlobePoints;
  const visiblePointIds = useMemo(
    () => new Set(activeDrawerPoints.map(getPointKey)),
    [activeDrawerPoints]
  );
  const selectedPoint = !showListedOnGlobe || (modeSelectedPoint && visiblePointIds.has(getPointKey(modeSelectedPoint)))
    ? modeSelectedPoint
    : null;
  const points = useMemo(() => limitGlobePoints({
    activePlaybackPoint,
    budget: globeProfile.markerBudget,
    countryPointGuarantee: globeProfile.countryPointGuarantee,
    points: rawGlobePoints,
    requiredPoints: activeDrawerPoints,
    selectedPoint
  }), [
    activeDrawerPoints,
    activePlaybackPoint,
    globeProfile.countryPointGuarantee,
    globeProfile.markerBudget,
    rawGlobePoints,
    selectedPoint
  ]);
  const markerColor = showListedOnGlobe ? activeTheme.globe.markers.listed : defaultMarkerColor;
  const markerColorMode = showListedOnGlobe ? "single" : activeMode.markerColorMode;
  const selectedCountryOutlineColor = selectedPoint
    ? resolvePointMarkerColor(selectedPoint, markerColorMode, markerColor, activeTheme.globe)
    : defaultMarkerColor;

  return {
    markerColor,
    markerColorMode,
    points,
    selectedCountryOutlineColor,
    selectedPoint
  };
}
