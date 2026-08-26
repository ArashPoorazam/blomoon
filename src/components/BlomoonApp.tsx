"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { formatCoordinate, type CountryInfo } from "@/lib/geo";
import type { AppClientConfig } from "@/lib/app-config/types";
import { defaultMode, getTerraMode, terraModes } from "@/lib/modes/registry";
import type { TerraDataset, TerraModeId, TerraPoint } from "@/lib/modes/types";
import { useAudioPlayback } from "@/lib/modes/useAudioPlayback";
import { useModeDataset } from "@/lib/modes/useModeDataset";
import { resolvePointMarkerColor } from "@/lib/theme/globe";
import {
  defaultTheme,
  getTerraTheme,
  resolveMarkerColor,
  type TerraThemeId
} from "@/lib/theme/themes";
import { AccountMenu } from "./account/AccountMenu";
import { AuthGate, AuthModal } from "./account/AuthModal";
import { useViewer } from "./account/useViewer";
import { useFavourites } from "./favourites/useFavourites";
import { GlobeScene } from "./GlobeScene";
import { RadioMiniPlayer, RadioPlaybackPanel } from "./RadioPlaybackPanel";
import { SideDrawer } from "./SideDrawer";

type BlomoonAppProps = {
  appConfig: AppClientConfig;
  initialDatasets?: Partial<Record<TerraModeId, TerraDataset>>;
};

export function BlomoonApp({ appConfig, initialDatasets }: BlomoonAppProps) {
  const [activeModeId, setActiveModeId] = useState<TerraModeId>(defaultMode.id);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<TerraPoint | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [showListedOnGlobe, setShowListedOnGlobe] = useState(false);
  const [themeId, setThemeId] = useState<TerraThemeId>(defaultTheme.id);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [drawerView, setDrawerView] = useState<"list" | "favourites">("list");
  const [pendingFavouriteSelection, setPendingFavouriteSelection] = useState<{ modeId: TerraModeId; point: TerraPoint } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeMode = getTerraMode(activeModeId);
  const activeTheme = getTerraTheme(themeId);
  const modeState = useModeDataset(activeMode, selectedCountry?.code ?? null, initialDatasets?.[activeMode.id]);
  const audioPlayback = useAudioPlayback(activeMode.playback ?? null);
  const viewer = useViewer();
  const getModeLabel = useCallback((modeId: TerraModeId) => (
    terraModes.find((mode) => mode.id === modeId)?.label ?? String(modeId)
  ), []);
  const favourites = useFavourites({
    getModeLabel,
    user: viewer.user,
    onAuthRequired: () => setAuthModalOpen(true)
  });
  const drawerOpen = !drawerCollapsed;
  const defaultMarkerColor = resolveMarkerColor(activeTheme, activeMode.markerColorToken) ?? activeTheme.globe.markers.defaultSingle;
  const favouritePoints = useMemo(
    () => favourites.groups.flatMap((group) => group.favourites.map((favourite) => favourite.point)),
    [favourites.groups]
  );
  const activeDrawerPoints = drawerView === "favourites" && !modeState.selectedId ? favouritePoints : modeState.visiblePoints;
  const globePoints = showListedOnGlobe ? activeDrawerPoints : modeState.globePoints;
  const visiblePointIds = useMemo(
    () => new Set(activeDrawerPoints.map(getPointKey)),
    [activeDrawerPoints]
  );
  const globeSelectedPoint = !showListedOnGlobe || (modeState.selectedPoint && visiblePointIds.has(getPointKey(modeState.selectedPoint)))
    ? modeState.selectedPoint
    : null;
  const globeMarkerColor = showListedOnGlobe ? activeTheme.globe.markers.listed : defaultMarkerColor;
  const globeMarkerColorMode = showListedOnGlobe ? "single" : activeMode.markerColorMode;
  const selectedCountryOutlineColor = globeSelectedPoint
    ? resolvePointMarkerColor(globeSelectedPoint, globeMarkerColorMode, globeMarkerColor, activeTheme.globe)
    : defaultMarkerColor;
  const detailAccessory =
    activeMode.playback && modeState.detail ? (
      <RadioPlaybackPanel detail={modeState.detail} playback={audioPlayback} playbackLabel={activeMode.playback.label} />
    ) : null;

  useEffect(() => {
    if (viewer.user?.selectedTheme) {
      setThemeId(viewer.user.selectedTheme);
    }
  }, [viewer.user?.selectedTheme]);

  useEffect(() => {
    if (!pendingFavouriteSelection || pendingFavouriteSelection.modeId !== activeModeId) {
      return;
    }

    modeState.selectPoint(pendingFavouriteSelection.point);
    setPendingFavouriteSelection(null);
  }, [activeModeId, modeState.selectPoint, pendingFavouriteSelection]);

  const selectPoint = useCallback((point: TerraPoint) => {
    modeState.selectPoint(point);
    setDrawerCollapsed(false);
    setDrawerView("list");

    if (viewer.user && activeMode.clickEndpoint) {
      void fetch(activeMode.clickEndpoint(point.id), { method: "POST" });
    }
  }, [activeMode, modeState.selectPoint, viewer.user]);

  const selectMode = useCallback((modeId: TerraModeId) => {
    setActiveModeId(modeId);
    setDrawerCollapsed(false);
    setDrawerView("list");
    setHoveredPoint(null);
  }, []);

  const selectCountry = useCallback((country: CountryInfo | null) => {
    const nextCountry = country?.code === selectedCountry?.code ? null : country;
    setSelectedCountry(nextCountry);
    setDrawerCollapsed(false);
    setDrawerView("list");
    setHoveredPoint(null);
  }, [selectedCountry?.code]);

  const selectTheme = useCallback((nextThemeId: TerraThemeId) => {
    setThemeId(nextThemeId);

    if (viewer.user) {
      void fetch("/api/users/me/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: nextThemeId })
      }).then(() => viewer.refresh());
    }
  }, [viewer]);

  const clearCountrySelection = useCallback(() => {
    selectCountry(null);
  }, [selectCountry]);

  const handleMouseMove = useCallback((event: MouseEvent<HTMLElement>) => {
    if (tooltipRef.current) {
      tooltipRef.current.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`;
    }
  }, []);

  const selectFavourite = useCallback((modeId: TerraModeId, point: TerraPoint) => {
    setActiveModeId(modeId);
    setPendingFavouriteSelection({ modeId, point });
    setDrawerView("list");
    setDrawerCollapsed(false);
  }, []);

  if (viewer.loading) {
    return (
      <main className="auth-gate">
        <div className="auth-modal auth-loading" role="status" aria-live="polite">
          <LoaderMessage />
        </div>
      </main>
    );
  }

  if (!viewer.user) {
    return (
      <AuthGate
        googleAuthEnabled={appConfig.googleAuthEnabled}
        serviceError={viewer.error}
        onAuthenticated={async () => {
          await viewer.refresh();
        }}
      />
    );
  }

  return (
    <main
      className={`blomoon-shell ${drawerOpen ? "drawer-open" : "drawer-closed"}`}
      data-theme={activeTheme.id}
      onMouseMove={handleMouseMove}
    >
      <div className="globe-stage">
        <GlobeScene
          focusKey={modeState.selectedId}
          markerColor={globeMarkerColor}
          markerColorMode={globeMarkerColorMode}
          points={globePoints}
          selectedCountryCode={selectedCountry?.code ?? null}
          selectedCountryOutlineColor={selectedCountryOutlineColor}
          selectedPoint={globeSelectedPoint}
          theme={activeTheme.globe}
          onCountrySelect={selectCountry}
          onPointHover={setHoveredPoint}
          onPointSelect={selectPoint}
        />
      </div>

      <AccountMenu
        contactLinks={appConfig.contactLinks}
        loading={viewer.loading}
        selectedThemeId={themeId}
        user={viewer.user}
        onAuthOpen={() => setAuthModalOpen(true)}
        onLogout={() => {
          void viewer.refresh();
          setThemeId(defaultTheme.id);
        }}
        onThemeChange={selectTheme}
      />

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
        favouritePointIds={favourites.favouriteIds}
        favouriteGroups={favourites.groups}
        favouritesLoading={favourites.loading}
        hasMoreRemotePoints={modeState.hasMoreVisiblePoints}
        isLoadingDrawerTask={modeState.isLoadingDrawerTask}
        loading={modeState.listLoading}
        loadingTaskLabel={modeState.loadingTaskLabel}
        loadingMoreRemotePoints={modeState.loadingMoreVisiblePoints}
        modes={terraModes}
        points={modeState.visiblePoints}
        providerError={modeState.providerError}
        query={modeState.query}
        selectedCountry={selectedCountry}
        selectedId={modeState.selectedId}
        showListedOnGlobe={showListedOnGlobe}
        sortId={modeState.sortId}
        totalPoints={modeState.totalVisiblePoints}
        totalPointsKind={modeState.totalVisiblePointsKind}
        view={drawerView}
        onCountryFilterChange={selectCountry}
        onClearCountrySelection={clearCountrySelection}
        onClearSelection={() => {
          modeState.clearSelection();
          setDrawerView("list");
        }}
        onCloseFavourites={() => setDrawerView("list")}
        onFavouriteSelect={selectFavourite}
        onLoadMoreRemotePoints={modeState.loadMoreVisiblePoints}
        onModeChange={selectMode}
        onOpenFavourites={() => {
          modeState.clearSelection();
          setDrawerView("favourites");
          setDrawerCollapsed(false);
        }}
        onPointSelect={selectPoint}
        onQueryChange={modeState.setQuery}
        onSortChange={modeState.setSortId}
        onToggleFavourite={(point) => {
          void favourites.toggleFavourite(point);
        }}
        onToggleCollapsed={() => setDrawerCollapsed((value) => !value)}
        onToggleShowListedOnGlobe={() => setShowListedOnGlobe((value) => !value)}
      />

      <AuthModal
        googleAuthEnabled={appConfig.googleAuthEnabled}
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={async () => {
          await viewer.refresh();
        }}
      />

      {activeMode.playback && audioPlayback.point ? (
        <RadioMiniPlayer playback={audioPlayback} playbackLabel={activeMode.playback.label} />
      ) : null}
    </main>
  );
}

function LoaderMessage() {
  return (
    <div className="auth-loading-content">
      <div className="drawer-kicker">Blomoon</div>
      <h2>Loading account</h2>
    </div>
  );
}

function getPointKey(point: TerraPoint) {
  return `${point.modeId}:${point.id}`;
}
