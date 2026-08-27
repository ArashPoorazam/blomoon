"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { formatCoordinate, type CountryInfo } from "@/lib/geo";
import type { AppClientConfig } from "@/lib/app-config/types";
import { defaultMode, getTerraMode, terraModes } from "@/lib/modes/registry";
import { getNextPlaybackPoint } from "@/lib/modes/playbackNavigation";
import type { TerraDataset, TerraModeId, TerraPoint } from "@/lib/modes/types";
import { useAudioPlayback } from "@/lib/modes/useAudioPlayback";
import { useModeDataset } from "@/lib/modes/useModeDataset";
import { usePrefetchedRandomPoint } from "@/lib/modes/usePrefetchedRandomPoint";
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
import { ModeComingSoonModal, ShellControlRail } from "./ShellControlRail";
import { SideDrawer } from "./SideDrawer";

type BlomoonAppProps = {
  appConfig: AppClientConfig;
  initialDatasets?: Partial<Record<TerraModeId, TerraDataset>>;
};

const EARTH_SPIN_INTERRUPT_EVENTS = ["keydown", "mousedown", "pointerdown", "click"] as const;

export function BlomoonApp({ appConfig, initialDatasets }: BlomoonAppProps) {
  const [activeModeId, setActiveModeId] = useState<TerraModeId>(defaultMode.id);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<TerraPoint | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [earthSpinEnabled, setEarthSpinEnabled] = useState(false);
  const [showListedOnGlobe, setShowListedOnGlobe] = useState(false);
  const [themeId, setThemeId] = useState<TerraThemeId>(defaultTheme.id);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [modeNoticeOpen, setModeNoticeOpen] = useState(false);
  const [drawerView, setDrawerView] = useState<"list" | "favourites">("list");
  const [playbackQueueSource, setPlaybackQueueSource] = useState<"list" | "favourites">("list");
  const [pendingFavouriteSelection, setPendingFavouriteSelection] = useState<{ modeId: TerraModeId; point: TerraPoint } | null>(null);
  const ignoreNextEarthSpinToggle = useRef(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeMode = getTerraMode(activeModeId);
  const activeTheme = getTerraTheme(themeId);
  const modeState = useModeDataset(activeMode, selectedCountry?.code ?? null, initialDatasets?.[activeMode.id]);
  const audioPlayback = useAudioPlayback(activeMode.playback ?? null);
  const randomPlaybackPoint = usePrefetchedRandomPoint({
    enabled: Boolean(activeMode.playback?.randomPointEndpoint),
    endpoint: activeMode.playback?.randomPointEndpoint,
    excludePointId: audioPlayback.pointId
  });
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
  const activeModeFavouritePoints = useMemo(
    () => favourites.groups
      .filter((group) => group.modeId === activeModeId)
      .flatMap((group) => group.favourites.map((favourite) => favourite.point)),
    [activeModeId, favourites.groups]
  );
  const activeDrawerPoints = drawerView === "favourites" && !modeState.selectedId ? favouritePoints : modeState.visiblePoints;
  const playbackQueuePoints = playbackQueueSource === "favourites" ? activeModeFavouritePoints : modeState.visiblePoints;
  const activePlaybackPointKey = audioPlayback.point && (audioPlayback.status === "playing" || audioPlayback.status === "paused")
    ? getPointKey(audioPlayback.point)
    : null;
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
      <RadioPlaybackPanel
        detail={modeState.detail}
        favourited={favourites.favouriteIds.has(getPointKey(modeState.detail))}
        playback={audioPlayback}
        playbackLabel={activeMode.playback.label}
        onToggleFavourite={(point) => {
          void favourites.toggleFavourite(point);
        }}
      />
    ) : null;

  useEffect(() => {
    if (viewer.user?.selectedTheme) {
      setThemeId(viewer.user.selectedTheme);
    }
  }, [viewer.user?.selectedTheme]);

  useEffect(() => {
    if (!earthSpinEnabled) {
      return;
    }

    function stopEarthSpinOnInput(event: Event) {
      if (shouldPreventEarthSpinToggleActivation(event)) {
        event.preventDefault();
      }

      ignoreNextEarthSpinToggle.current ||= shouldIgnoreNextEarthSpinToggle(event);
      setEarthSpinEnabled(false);
    }

    EARTH_SPIN_INTERRUPT_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, stopEarthSpinOnInput, true);
    });
    return () => {
      EARTH_SPIN_INTERRUPT_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, stopEarthSpinOnInput, true);
      });
    };
  }, [earthSpinEnabled]);

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
    setPlaybackQueueSource("list");

    if (viewer.user && activeMode.clickEndpoint) {
      void fetch(activeMode.clickEndpoint(point.id), { method: "POST" });
    }
  }, [activeMode, modeState.selectPoint, viewer.user]);

  const selectCountry = useCallback((country: CountryInfo | null) => {
    const nextCountry = country?.code === selectedCountry?.code ? null : country;
    setSelectedCountry(nextCountry);
    setDrawerCollapsed(false);
    setDrawerView("list");
    setPlaybackQueueSource("list");
    setHoveredPoint(null);
  }, [selectedCountry?.code]);

  const openFavourites = useCallback(() => {
    modeState.clearSelection();
    setDrawerView("favourites");
    setPlaybackQueueSource("favourites");
    setDrawerCollapsed(false);
  }, [modeState.clearSelection]);

  const toggleEarthSpin = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (ignoreNextEarthSpinToggle.current) {
      ignoreNextEarthSpinToggle.current = false;
      return;
    }

    setEarthSpinEnabled((value) => !value);
  }, []);

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
    setPlaybackQueueSource("favourites");
    setDrawerCollapsed(false);
  }, []);

  const openPlaybackPoint = useCallback((point: TerraPoint) => {
    setActiveModeId(point.modeId);
    setDrawerCollapsed(false);

    if (point.modeId === activeModeId) {
      modeState.selectPoint(point);
      return;
    }

    setPendingFavouriteSelection({ modeId: point.modeId, point });
  }, [activeModeId, modeState.selectPoint]);

  const playNextStation = useCallback(() => {
    const nextPoint = getNextPlaybackPoint(playbackQueuePoints, audioPlayback.pointId);

    if (nextPoint) {
      void audioPlayback.play(nextPoint);
    }
  }, [audioPlayback, playbackQueuePoints]);

  const shuffleStation = useCallback(async () => {
    if (!activeMode.playback?.randomPointEndpoint) {
      return;
    }

    const randomPoint = await randomPlaybackPoint.takePoint();

    if (!randomPoint) {
      audioPlayback.reportError("Could not find a random station right now.");
      return;
    }

    await audioPlayback.play(randomPoint);
  }, [activeMode.playback?.randomPointEndpoint, audioPlayback, randomPlaybackPoint]);

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
          earthSpinEnabled={earthSpinEnabled}
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
        onAccountUpdated={viewer.refresh}
        onAuthOpen={() => setAuthModalOpen(true)}
        onLogout={() => {
          void viewer.refresh();
          setThemeId(defaultTheme.id);
        }}
        onThemeChange={selectTheme}
      />

      <ShellControlRail
        earthSpinEnabled={earthSpinEnabled}
        onOpenFavourites={openFavourites}
        onOpenModeNotice={() => setModeNoticeOpen(true)}
        onToggleEarthSpin={toggleEarthSpin}
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
        activePlaybackPointKey={activePlaybackPointKey}
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
        onCloseFavourites={() => {
          setDrawerView("list");
          setPlaybackQueueSource("list");
        }}
        onFavouriteSelect={selectFavourite}
        onLoadMoreRemotePoints={modeState.loadMoreVisiblePoints}
        onPointSelect={selectPoint}
        onQueryChange={modeState.setQuery}
        onSortChange={modeState.setSortId}
        onToggleFavourite={(point) => {
          void favourites.toggleFavourite(point);
        }}
        onToggleCollapsed={() => setDrawerCollapsed((value) => !value)}
        onToggleShowListedOnGlobe={() => setShowListedOnGlobe((value) => !value)}
      />

      {modeNoticeOpen ? (
        <ModeComingSoonModal onClose={() => setModeNoticeOpen(false)} />
      ) : null}

      <AuthModal
        googleAuthEnabled={appConfig.googleAuthEnabled}
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={async () => {
          await viewer.refresh();
        }}
      />

      {activeMode.playback && audioPlayback.point ? (
        <RadioMiniPlayer
          canPlayNext={playbackQueuePoints.length > 0}
          canShuffle={Boolean(activeMode.playback.randomPointEndpoint)}
          loadingRandom={randomPlaybackPoint.loading && !randomPlaybackPoint.point}
          playback={audioPlayback}
          playbackLabel={activeMode.playback.label}
          onNext={playNextStation}
          onPointOpen={openPlaybackPoint}
          onShuffle={() => {
            void shuffleStation();
          }}
        />
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

function shouldIgnoreNextEarthSpinToggle(event: Event) {
  if (!isEarthSpinToggleEvent(event)) {
    return false;
  }

  if (event instanceof KeyboardEvent) {
    return false;
  }

  return !(event instanceof MouseEvent) || event.button === 0;
}

function isEarthSpinToggleEvent(event: Event) {
  return event.target instanceof Element && Boolean(event.target.closest("[data-earth-spin-toggle]"));
}

function shouldPreventEarthSpinToggleActivation(event: Event) {
  return event instanceof KeyboardEvent
    && isEarthSpinToggleEvent(event)
    && (event.code === "Space" || event.code === "Enter");
}
