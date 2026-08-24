"use client";

import { Palette } from "lucide-react";
import { useCallback, useRef, useState, type MouseEvent } from "react";
import { findCountryByCode, formatCoordinate, getCountryAtCoordinates, type CountryInfo } from "@/lib/geo";
import { defaultMode, getTerraMode, terraModes } from "@/lib/modes/registry";
import type { TerraDataset, TerraModeId, TerraPoint } from "@/lib/modes/types";
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

type TerravueAppProps = {
  initialDatasets?: Partial<Record<TerraModeId, TerraDataset>>;
};

export function TerravueApp({ initialDatasets }: TerravueAppProps) {
  const [activeModeId, setActiveModeId] = useState<TerraModeId>(defaultMode.id);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<TerraPoint | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [themeId, setThemeId] = useState<TerraThemeId>(defaultTheme.id);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeMode = getTerraMode(activeModeId);
  const activeTheme = getTerraTheme(themeId);
  const nextTheme = getNextTerraTheme(themeId);
  const modeState = useModeDataset(activeMode, selectedCountry?.code ?? null, initialDatasets?.[activeMode.id]);
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

  const selectPoint = useCallback((point: TerraPoint) => {
    modeState.selectPoint(point);
    setSelectedCountry(findCountryByCode(point.countryCode) ?? getCountryAtCoordinates(point.latitude, point.longitude));
    setDrawerCollapsed(false);
  }, [modeState.selectPoint]);

  const selectMode = useCallback((modeId: TerraModeId) => {
    setActiveModeId(modeId);
    setDrawerCollapsed(false);
    setHoveredPoint(null);
  }, []);

  const selectCountry = useCallback((country: CountryInfo | null) => {
    const nextCountry = country?.code === selectedCountry?.code ? null : country;
    setSelectedCountry(nextCountry);
    setDrawerCollapsed(false);
    setHoveredPoint(null);
  }, [selectedCountry?.code]);

  const switchTheme = useCallback(() => {
    setThemeId(nextTheme.id);
  }, [nextTheme.id]);

  const clearCountrySelection = useCallback(() => {
    selectCountry(null);
  }, [selectCountry]);

  const handleMouseMove = useCallback((event: MouseEvent<HTMLElement>) => {
    if (tooltipRef.current) {
      tooltipRef.current.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`;
    }
  }, []);

  return (
    <main
      className={`terravue-shell ${drawerOpen ? "drawer-open" : "drawer-closed"}`}
      data-theme={activeTheme.id}
      onMouseMove={handleMouseMove}
    >
      <div className="globe-stage">
        <GlobeScene
          focusKey={modeState.selectedId}
          markerColor={defaultMarkerColor}
          markerColorMode={activeMode.markerColorMode}
          points={modeState.globePoints}
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
        hasMoreRemotePoints={modeState.hasMoreVisiblePoints}
        loadedRemotePointCount={modeState.loadedVisiblePointCount}
        loading={modeState.listLoading}
        loadingMoreRemotePoints={modeState.loadingMoreVisiblePoints}
        modes={terraModes}
        points={modeState.visiblePoints}
        providerError={modeState.providerError}
        query={modeState.query}
        selectedCountry={selectedCountry}
        selectedId={modeState.selectedId}
        totalPoints={modeState.totalVisiblePoints}
        totalPointsKind={modeState.totalVisiblePointsKind}
        remotePointLoadingStatus={modeState.visiblePointLoadingStatus}
        onClearCountrySelection={clearCountrySelection}
        onClearSelection={modeState.clearSelection}
        onLoadMoreRemotePoints={undefined}
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
