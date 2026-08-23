"use client";

import { Palette } from "lucide-react";
import { useRef, useState } from "react";
import { findCountryByCode, formatCoordinate, getCountryAtCoordinates, type CountryInfo } from "@/lib/geo";
import { defaultMode, getTerraMode, terraModes } from "@/lib/modes/registry";
import type { TerraModeId, TerraPoint } from "@/lib/modes/types";
import { useAudioPlayback } from "@/lib/modes/useAudioPlayback";
import { useModeDataset } from "@/lib/modes/useModeDataset";
import { resolvePointMarkerColor } from "@/lib/theme/globe";
import {
  defaultTheme,
  getNextTerraTheme,
  getTerraTheme,
  resolveMarkerColor,
  type TerraThemeId
} from "@/lib/theme/themes";
import { GlobeScene } from "./GlobeScene";
import { RadioMiniPlayer, RadioPlaybackPanel } from "./RadioPlaybackPanel";
import { SideDrawer } from "./SideDrawer";

export function TerravueApp() {
  const [activeModeId, setActiveModeId] = useState<TerraModeId>(defaultMode.id);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<TerraPoint | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [themeId, setThemeId] = useState<TerraThemeId>(defaultTheme.id);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeMode = getTerraMode(activeModeId);
  const activeTheme = getTerraTheme(themeId);
  const nextTheme = getNextTerraTheme(themeId);
  const modeState = useModeDataset(activeMode, selectedCountry?.code ?? null);
  const audioPlayback = useAudioPlayback(activeMode.playback ?? null);
  const drawerOpen = !drawerCollapsed;
  const defaultMarkerColor = resolveMarkerColor(activeTheme, activeMode.markerColorToken) ?? activeTheme.globe.markers.defaultSingle;
  const selectedCountryOutlineColor = modeState.selectedPoint
    ? resolvePointMarkerColor(modeState.selectedPoint, activeMode.markerColorMode, defaultMarkerColor, activeTheme.globe)
    : defaultMarkerColor;
  const detailAccessory =
    activeMode.playback && modeState.detail ? (
      <RadioPlaybackPanel detail={modeState.detail} playback={audioPlayback} playbackLabel={activeMode.playback.label} />
    ) : null;

  function selectPoint(point: TerraPoint) {
    modeState.selectPoint(point);
    setSelectedCountry(findCountryByCode(point.countryCode) ?? getCountryAtCoordinates(point.latitude, point.longitude));
    setDrawerCollapsed(false);
  }

  function selectMode(modeId: TerraModeId) {
    setActiveModeId(modeId);
    setDrawerCollapsed(false);
    setHoveredPoint(null);
  }

  function selectCountry(country: CountryInfo | null) {
    const nextCountry = country?.code === selectedCountry?.code ? null : country;
    setSelectedCountry(nextCountry);
    setDrawerCollapsed(false);
    setHoveredPoint(null);
  }

  function switchTheme() {
    setThemeId(nextTheme.id);
  }

  return (
    <main
      className={`terravue-shell ${drawerOpen ? "drawer-open" : "drawer-closed"}`}
      data-theme={activeTheme.id}
      onMouseMove={(event) => {
        if (tooltipRef.current) {
          tooltipRef.current.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`;
        }
      }}
    >
      <div className="globe-stage">
        <GlobeScene
          focusKey={modeState.selectedId}
          markerColor={defaultMarkerColor}
          markerColorMode={activeMode.markerColorMode}
          points={modeState.points}
          selectedCountryCode={selectedCountry?.code ?? null}
          selectedCountryOutlineColor={selectedCountryOutlineColor}
          selectedPoint={modeState.selectedPoint}
          theme={activeTheme.globe}
          onCountrySelect={selectCountry}
          onPointHover={setHoveredPoint}
          onPointSelect={selectPoint}
        />
      </div>

      <button
        aria-label={`Switch to ${nextTheme.label} theme`}
        className="theme-toggle"
        title={`Switch to ${nextTheme.label} theme`}
        type="button"
        onClick={switchTheme}
      >
        <Palette size={18} aria-hidden="true" />
      </button>

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
        selectedCountry={selectedCountry}
        selectedId={modeState.selectedId}
        totalPoints={modeState.points.length}
        onClearCountrySelection={() => selectCountry(null)}
        onClearSelection={modeState.clearSelection}
        onModeChange={selectMode}
        onPointSelect={selectPoint}
        onQueryChange={modeState.setQuery}
        onToggleCollapsed={() => setDrawerCollapsed((value) => !value)}
      />

      {activeMode.playback && audioPlayback.point ? (
        <RadioMiniPlayer playback={audioPlayback} playbackLabel={activeMode.playback.label} />
      ) : null}
    </main>
  );
}
