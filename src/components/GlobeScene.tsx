"use client";

import { Canvas } from "@react-three/fiber";
import { memo } from "react";
import type { CountryInfo } from "@/lib/geo";
import type { TerraPoint } from "@/lib/modes/types";
import type { GlobeTheme, MarkerColorMode } from "@/lib/theme/globe";
import { GlobeCameraController } from "./globe/CameraControls";
import { Earth } from "./globe/Earth";
import { PointMarkers } from "./globe/PointMarkers";

type GlobeSceneProps = {
  crosshairEnabled: boolean;
  dpr: [number, number];
  earthSpinEnabled: boolean;
  focusKey: string | null;
  focusPoint: TerraPoint | null;
  hoverEnabled: boolean;
  maxCameraDistance: number;
  motionEnabled: boolean;
  markerColor?: string;
  markerColorMode: MarkerColorMode;
  points: TerraPoint[];
  activePlaybackPoint?: TerraPoint | null;
  selectedCountryCode: string | null;
  selectedCountryOutlineColor: string;
  selectedPoint: TerraPoint | null;
  theme: GlobeTheme;
  onCountrySelect: (country: CountryInfo | null) => void;
  onCrosshairPoint: (point: TerraPoint) => void;
  onGlobeInteractionStart: () => void;
  onPointHover: (point: TerraPoint | null) => void;
  onPointSelect: (point: TerraPoint) => void;
};

export const GlobeScene = memo(function GlobeScene({
  crosshairEnabled,
  dpr,
  earthSpinEnabled,
  focusKey,
  focusPoint,
  hoverEnabled,
  maxCameraDistance,
  motionEnabled,
  markerColor,
  markerColorMode,
  points,
  activePlaybackPoint,
  selectedCountryCode,
  selectedCountryOutlineColor,
  selectedPoint,
  theme,
  onCountrySelect,
  onCrosshairPoint,
  onGlobeInteractionStart,
  onPointHover,
  onPointSelect
}: GlobeSceneProps) {
  return (
    <Canvas camera={{ position: [0, 0.35, 5.2], fov: 42 }} dpr={dpr}>
      <color attach="background" args={[theme.ocean]} />

      <Earth
        selectedCountryOutlineColor={selectedCountryOutlineColor}
        selectedCountryCode={selectedCountryCode}
        theme={theme}
        onCountrySelect={onCountrySelect}
      />
      <PointMarkers
        markerColor={markerColor}
        markerColorMode={markerColorMode}
        points={points}
        activePlaybackPoint={activePlaybackPoint}
        selectedPoint={selectedPoint}
        theme={theme}
        hoverEnabled={hoverEnabled}
        onHover={onPointHover}
        onSelect={onPointSelect}
      />

      <GlobeCameraController
        crosshairEnabled={crosshairEnabled}
        earthSpinEnabled={earthSpinEnabled}
        focusKey={focusKey}
        focusPoint={focusPoint}
        maxDistance={maxCameraDistance}
        motionEnabled={motionEnabled}
        points={points}
        onCrosshairPoint={onCrosshairPoint}
        onUserInteractionStart={onGlobeInteractionStart}
      />
    </Canvas>
  );
});
