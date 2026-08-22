"use client";

import { useRef, useState } from "react";
import { formatCoordinate } from "@/lib/geo";
import { defaultMode, getTerraMode, terraModes } from "@/lib/modes/registry";
import type { TerraModeId, TerraPoint } from "@/lib/modes/types";
import { useModeDataset } from "@/lib/modes/useModeDataset";
import { useRadioPlayback } from "@/lib/modes/useRadioPlayback";
import { GlobeScene } from "./GlobeScene";
import { RadioPlaybackPanel } from "./RadioPlaybackPanel";
import { SideDrawer } from "./SideDrawer";

export function TerravueApp() {
  const [activeModeId, setActiveModeId] = useState<TerraModeId>(defaultMode.id);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<TerraPoint | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeMode = getTerraMode(activeModeId);
  const modeState = useModeDataset(activeMode);
  const radioPlayback = useRadioPlayback(activeModeId === "radio" ? modeState.selectedId : null);
  const drawerOpen = !drawerCollapsed;
  const detailAccessory =
    activeModeId === "radio" && modeState.detail?.modeId === "radio" ? (
      <RadioPlaybackPanel detail={modeState.detail} playback={radioPlayback} />
    ) : null;

  function selectPoint(point: TerraPoint) {
    modeState.selectPoint(point);
    setDrawerCollapsed(false);
  }

  function selectMode(modeId: TerraModeId) {
    setActiveModeId(modeId);
    setDrawerCollapsed(false);
    setHoveredPoint(null);
  }

  return (
    <main
      className={`terravue-shell ${drawerOpen ? "drawer-open" : "drawer-closed"}`}
      onMouseMove={(event) => {
        if (tooltipRef.current) {
          tooltipRef.current.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`;
        }
      }}
    >
      <div className="globe-stage">
        <GlobeScene
          focusKey={modeState.selectedId}
          markerColor={activeMode.markerColor}
          markerColorMode={activeMode.markerColorMode}
          points={modeState.visiblePoints}
          selectedPoint={modeState.selectedPoint}
          onPointHover={setHoveredPoint}
          onPointSelect={selectPoint}
        />
      </div>

      {modeState.loading ? (
        <div className="loading-layer">
          <div className="loading-pill">{activeMode.loadingLabel}</div>
        </div>
      ) : null}

      {hoveredPoint ? (
        <div
          ref={tooltipRef}
          className="point-tooltip"
        >
          <div className="point-tooltip-name">{hoveredPoint.name}</div>
          <div className="point-tooltip-meta">
            {formatCoordinate(hoveredPoint.latitude, "N", "S")},{" "}
            {formatCoordinate(hoveredPoint.longitude, "E", "W")}
          </div>
        </div>
      ) : null}

      <SideDrawer
        activeMode={activeMode}
        activeModeId={activeModeId}
        collapsed={drawerCollapsed}
        detail={modeState.detail}
        detailAccessory={detailAccessory}
        loading={modeState.loading}
        modes={terraModes}
        points={modeState.visiblePoints}
        providerError={modeState.providerError}
        query={modeState.query}
        selectedId={modeState.selectedId}
        source={modeState.source}
        totalPoints={modeState.points.length}
        onClearSelection={modeState.clearSelection}
        onModeChange={selectMode}
        onPointSelect={selectPoint}
        onQueryChange={modeState.setQuery}
        onToggleCollapsed={() => setDrawerCollapsed((value) => !value)}
      />
    </main>
  );
}
