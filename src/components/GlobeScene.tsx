"use client";

import { hasPointLocation } from "@/lib/modes/location";
import { Canvas } from "@react-three/fiber";
import { memo, useMemo, type RefObject } from "react";
import type { CountryInfo } from "@/lib/geo/countries";
import type { TerraPoint } from "@/lib/modes/types";
import type { GlobeTheme, MarkerColorMode } from "@/lib/theme/globe";
import { GlobeCameraController } from "./globe/CameraControls";
import { Earth } from "./globe/Earth";
import { PointScreenAnchor } from "./globe/PointScreenAnchor";
import { GLOBE_CAMERA_FOV } from "./globe/cameraFit";
import { PointMarkers } from "./globe/PointMarkers";

type GlobeSceneProps = {
  anchorPoint?: TerraPoint | null;
  anchorTarget?: RefObject<HTMLElement | null>;
  crosshairEnabled: boolean;
  fitViewport: boolean;
  dpr: [number, number];
  earthSpinEnabled: boolean;
  focusKey: string | null;
  focusPoint: TerraPoint | null;
  hoverEnabled: boolean;
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
  fitViewport,
  anchorPoint,
  anchorTarget,
  dpr,
  earthSpinEnabled,
  focusKey,
  focusPoint,
  hoverEnabled,
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
  const locatedPoints = useMemo(() => points.filter(hasPointLocation), [points]);
  return (
    <Canvas camera={{ position: [0, 0.35, 5.2], fov: GLOBE_CAMERA_FOV }} dpr={dpr}>
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
        points={locatedPoints}
        activePlaybackPoint={hasPointLocation(activePlaybackPoint) ? activePlaybackPoint : null}
        selectedPoint={hasPointLocation(selectedPoint) ? selectedPoint : null}
        theme={theme}
        hoverEnabled={hoverEnabled}
        onHover={onPointHover}
        onSelect={onPointSelect}
      />

      {anchorTarget ? <PointScreenAnchor point={anchorPoint ?? null} target={anchorTarget} /> : null}

      <GlobeCameraController
        fitViewport={fitViewport}
        crosshairEnabled={crosshairEnabled}
        earthSpinEnabled={earthSpinEnabled}
        focusKey={focusKey}
        focusPoint={hasPointLocation(focusPoint) ? focusPoint : null}
        motionEnabled={motionEnabled}
        points={locatedPoints}
        onCrosshairPoint={onCrosshairPoint}
        onUserInteractionStart={onGlobeInteractionStart}
      />
    </Canvas>
  );
});
