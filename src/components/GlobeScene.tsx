"use client";

import { Canvas } from "@react-three/fiber";
import { memo } from "react";
import type { CountryInfo } from "@/lib/geo";
import type { TerraPoint } from "@/lib/modes/types";
import type { GlobeTheme, MarkerColorMode } from "@/lib/theme/globe";
import { AdaptiveOrbitControls, CameraFocus } from "./globe/CameraControls";
import { Earth } from "./globe/Earth";
import { PointMarkers } from "./globe/PointMarkers";

type GlobeSceneProps = {
  focusKey: string | null;
  markerColor?: string;
  markerColorMode: MarkerColorMode;
  points: TerraPoint[];
  selectedCountryCode: string | null;
  selectedCountryOutlineColor: string;
  selectedPoint: TerraPoint | null;
  theme: GlobeTheme;
  onCountrySelect: (country: CountryInfo | null) => void;
  onPointHover: (point: TerraPoint | null) => void;
  onPointSelect: (point: TerraPoint) => void;
};

export const GlobeScene = memo(function GlobeScene({
  focusKey,
  markerColor,
  markerColorMode,
  points,
  selectedCountryCode,
  selectedCountryOutlineColor,
  selectedPoint,
  theme,
  onCountrySelect,
  onPointHover,
  onPointSelect
}: GlobeSceneProps) {
  return (
    <Canvas camera={{ position: [0, 0.35, 5.2], fov: 42 }} dpr={[1, 2]}>
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
        selectedPoint={selectedPoint}
        theme={theme}
        onHover={onPointHover}
        onSelect={onPointSelect}
      />

      <CameraFocus focusKey={focusKey} selectedPoint={selectedPoint} />
      <AdaptiveOrbitControls />
    </Canvas>
  );
});
