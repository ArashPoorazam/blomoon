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
  listedPoints: TerraPoint[];
  globeProfile: GlobeProfile;
  modeGlobePoints: TerraPoint[];
  modeSelectedPoint: TerraPoint | null;
  showListedOnGlobe: boolean;
};

export function useDisplayedGlobePoints({
  activeMode,
  activePlaybackPoint,
  activeTheme,
  listedPoints,
  globeProfile,
  modeGlobePoints,
  modeSelectedPoint,
  showListedOnGlobe
}: DisplayedGlobePointsParams) {
  const defaultMarkerColor = resolveMarkerColor(activeTheme, activeMode.markerColorToken)
    ?? activeTheme.globe.markers.defaultSingle;
  const activeDrawerPoints = useMemo(() => uniquePoints(listedPoints), [listedPoints]);
  const defaultGlobePoints = useMemo(
    () => uniquePoints([...modeGlobePoints, ...activeDrawerPoints]),
    [activeDrawerPoints, modeGlobePoints]
  );
  const visiblePointIds = useMemo(
    () => new Set(activeDrawerPoints.map(getPointKey)),
    [activeDrawerPoints]
  );
  const selectedPoint = !showListedOnGlobe || (modeSelectedPoint && visiblePointIds.has(getPointKey(modeSelectedPoint)))
    ? modeSelectedPoint
    : null;
  const points = useMemo(() => showListedOnGlobe ? activeDrawerPoints : limitGlobePoints({
    activePlaybackPoint: null,
    budget: globeProfile.markerBudget,
    countryPointGuarantee: globeProfile.countryPointGuarantee,
    points: defaultGlobePoints,
    requiredPoints: activeDrawerPoints,
    selectedPoint: null
  }), [
    showListedOnGlobe,
    activeDrawerPoints,
    globeProfile.countryPointGuarantee,
    globeProfile.markerBudget,
    defaultGlobePoints
  ]);
  const markerColor = showListedOnGlobe ? activeTheme.globe.markers.listed : defaultMarkerColor;
  const markerColorMode = showListedOnGlobe ? "single" : activeMode.markerColorMode;
  const selectedCountryOutlineColor = selectedPoint
    ? resolvePointMarkerColor(selectedPoint, markerColorMode, markerColor, activeTheme.globe)
    : defaultMarkerColor;

  return {
    activePlaybackPoint: !showListedOnGlobe || (activePlaybackPoint && visiblePointIds.has(getPointKey(activePlaybackPoint)))
      ? activePlaybackPoint : null,
    markerColor,
    markerColorMode,
    points,
    selectedCountryOutlineColor,
    selectedPoint
  };
}
