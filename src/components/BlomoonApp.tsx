"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { formatCoordinate, type CountryInfo } from "@/lib/geo";
import type { AppClientConfig } from "@/lib/app-config/types";
import { limitGlobePoints } from "@/lib/modes/displayBudget";
import { getPointKey } from "@/lib/modes/pointKeys";
import { defaultMode, getTerraMode, terraModes } from "@/lib/modes/registry";
import { getNextPlaybackPoint } from "@/lib/modes/playbackNavigation";
import type { TerraDataset, TerraModeId, TerraPoint } from "@/lib/modes/types";
import { useAudioPlayback } from "@/lib/modes/useAudioPlayback";
import { useModeDataset } from "@/lib/modes/useModeDataset";
import { usePrefetchedRandomPoint } from "@/lib/modes/usePrefetchedRandomPoint";
import { authClient } from "@/lib/auth/client";
import { resolvePointMarkerColor } from "@/lib/theme/globe";
import {
  defaultTheme,
  getTerraTheme,
  resolveMarkerColor,
  type TerraThemeId
} from "@/lib/theme/themes";
import { AccountModalShell } from "./account/AccountModalShell";
import { AuthModal } from "./account/AuthModal";
import { useViewer } from "./account/useViewer";
import { AudioMiniPlayer, AudioPlaybackPanel } from "./AudioPlaybackPanel";
import { FavouriteListPicker } from "./favourites/FavouriteListPicker";
import { useFavourites } from "./favourites/useFavourites";
import { GlobeScene } from "./GlobeScene";
import { useEarthSpinControls } from "./globe/useEarthSpinControls";
import { useGlobeProfile } from "./globe/useGlobeProfile";
import type { DrawerMobilePosition, ShellDrawerView } from "./shell/drawerState";
import { ShellChrome } from "./shell/ShellChrome";
import { SideDrawer } from "./SideDrawer";

type BlomoonAppProps = {
  appConfig: AppClientConfig;
  initialDatasets?: Partial<Record<TerraModeId, TerraDataset>>;
};

export function BlomoonApp({ appConfig, initialDatasets }: BlomoonAppProps) {
  const router = useRouter();
  const [activeModeId, setActiveModeId] = useState<TerraModeId>(defaultMode.id);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [mobileDrawerPosition, setMobileDrawerPosition] = useState<DrawerMobilePosition>("standard");
  const [hoveredPoint, setHoveredPoint] = useState<TerraPoint | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [showListedOnGlobe, setShowListedOnGlobe] = useState(false);
  const [themeId, setThemeId] = useState<TerraThemeId>(defaultTheme.id);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [drawerView, setDrawerView] = useState<ShellDrawerView>("main");
  const [playbackQueueSource, setPlaybackQueueSource] = useState<"list" | "favourites">("list");
  const [pendingFavouriteSelection, setPendingFavouriteSelection] = useState<{ modeId: TerraModeId; point: TerraPoint } | null>(null);
  const [favouritePickerPoint, setFavouritePickerPoint] = useState<TerraPoint | null>(null);
  const [mobileLogoutConfirmOpen, setMobileLogoutConfirmOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeMode = getTerraMode(activeModeId);
  const activeTheme = getTerraTheme(themeId);
  const globeProfile = useGlobeProfile();
  const earthSpin = useEarthSpinControls(globeProfile.motionEnabled);
  const modeState = useModeDataset(activeMode, selectedCountry?.code ?? null, initialDatasets?.[activeMode.id]);
  const audioPlayback = useAudioPlayback(activeMode.playback ?? null);
  const randomPlaybackPoint = usePrefetchedRandomPoint({
    enabled: Boolean(activeMode.playback?.randomPointEndpoint),
    endpoint: activeMode.playback?.randomPointEndpoint,
    excludePointId: audioPlayback.pointId
  });
  const viewer = useViewer();
  const favourites = useFavourites({
    user: viewer.user,
    onAuthRequired: () => setAuthModalOpen(true)
  });
  const drawerOpen = !drawerCollapsed && mobileDrawerPosition !== "closed";
  const defaultMarkerColor = resolveMarkerColor(activeTheme, activeMode.markerColorToken) ?? activeTheme.globe.markers.defaultSingle;
  const favouritePoints = useMemo(
    () => uniquePoints(favourites.lists.flatMap((list) => list.items.map((favourite) => favourite.point))),
    [favourites.lists]
  );
  const activeModeFavouritePoints = useMemo(
    () => uniquePoints(favourites.lists
      .flatMap((list) => list.items.map((favourite) => favourite.point))
      .filter((point) => point.modeId === activeModeId)),
    [activeModeId, favourites.lists]
  );
  const activeDrawerPoints = drawerView === "favourites" && !modeState.selectedId ? favouritePoints : modeState.visiblePoints;
  const playbackQueuePoints = playbackQueueSource === "favourites" ? activeModeFavouritePoints : modeState.visiblePoints;
  const activePlaybackPointKey = audioPlayback.point && (audioPlayback.status === "playing" || audioPlayback.status === "paused")
    ? getPointKey(audioPlayback.point)
    : null;
  const rawGlobePoints = showListedOnGlobe ? activeDrawerPoints : modeState.globePoints;
  const visiblePointIds = useMemo(
    () => new Set(activeDrawerPoints.map(getPointKey)),
    [activeDrawerPoints]
  );
  const globeSelectedPoint = !showListedOnGlobe || (modeState.selectedPoint && visiblePointIds.has(getPointKey(modeState.selectedPoint)))
    ? modeState.selectedPoint
    : null;
  const globePoints = useMemo(() => limitGlobePoints({
    activePlaybackPoint: audioPlayback.point,
    budget: globeProfile.markerBudget,
    points: rawGlobePoints,
    selectedPoint: globeSelectedPoint
  }), [audioPlayback.point, globeProfile.markerBudget, globeSelectedPoint, rawGlobePoints]);
  const globeMarkerColor = showListedOnGlobe ? activeTheme.globe.markers.listed : defaultMarkerColor;
  const globeMarkerColorMode = showListedOnGlobe ? "single" : activeMode.markerColorMode;
  const selectedCountryOutlineColor = globeSelectedPoint
    ? resolvePointMarkerColor(globeSelectedPoint, globeMarkerColorMode, globeMarkerColor, activeTheme.globe)
    : defaultMarkerColor;
  const openFavouritePicker = useCallback((point: TerraPoint) => {
    if (!viewer.user) {
      setAuthModalOpen(true);
      return;
    }

    setFavouritePickerPoint(point);
  }, [viewer.user]);
  const detailAccessory =
    activeMode.playback && modeState.detail ? (
      <AudioPlaybackPanel
        detail={modeState.detail}
        favourited={favourites.favouriteIds.has(getPointKey(modeState.detail))}
        itemSingularLabel={activeMode.copy.itemSingular}
        playback={audioPlayback}
        playbackLabel={activeMode.playback.label}
        onToggleFavourite={openFavouritePicker}
      />
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
    setMobileDrawerPosition("full");
    setDrawerView("point-detail");
    setPlaybackQueueSource("list");

    if (viewer.user && activeMode.clickEndpoint) {
      void fetch(activeMode.clickEndpoint(point.id), { method: "POST" });
    }
  }, [activeMode, modeState.selectPoint, viewer.user]);

  const selectCountry = useCallback((country: CountryInfo | null) => {
    const nextCountry = country?.code === selectedCountry?.code ? null : country;
    setSelectedCountry(nextCountry);
    setDrawerCollapsed(false);
    setMobileDrawerPosition("standard");
    setDrawerView("main");
    setPlaybackQueueSource("list");
    setHoveredPoint(null);
  }, [selectedCountry?.code]);

  const openFavourites = useCallback(() => {
    modeState.clearSelection();
    setDrawerView("favourites");
    setPlaybackQueueSource("favourites");
    setDrawerCollapsed(false);
    setMobileDrawerPosition("standard");
  }, [modeState.clearSelection]);

  const openModeSwitcher = useCallback(() => {
    modeState.clearSelection();
    setDrawerView("mode-switcher");
    setDrawerCollapsed(false);
    setMobileDrawerPosition("standard");
  }, [modeState.clearSelection]);

  const openAccountDrawer = useCallback(() => {
    modeState.clearSelection();
    setDrawerView("account");
    setDrawerCollapsed(false);
    setMobileDrawerPosition("standard");
  }, [modeState.clearSelection]);

  const restoreHomeDrawer = useCallback(() => {
    modeState.clearSelection();
    setDrawerView("main");
    setPlaybackQueueSource("list");
    setDrawerCollapsed(false);
    setMobileDrawerPosition("standard");
  }, [modeState.clearSelection]);

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

  const updateQuery = useCallback((value: string) => {
    modeState.setQuery(value);
    setMobileDrawerPosition("full");
  }, [modeState.setQuery]);

  const handleMouseMove = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (tooltipRef.current) {
      tooltipRef.current.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`;
    }
  }, []);

  const selectFavourite = useCallback((modeId: TerraModeId, point: TerraPoint) => {
    setActiveModeId(modeId);
    setPendingFavouriteSelection({ modeId, point });
    setDrawerView("point-detail");
    setPlaybackQueueSource("favourites");
    setDrawerCollapsed(false);
    setMobileDrawerPosition("full");
  }, []);

  const selectMode = useCallback((modeId: TerraModeId) => {
    setActiveModeId(modeId);
    setDrawerView("main");
    setPlaybackQueueSource("list");
    setDrawerCollapsed(false);
    setMobileDrawerPosition("standard");
    setHoveredPoint(null);
  }, []);

  const openPlaybackPoint = useCallback((point: TerraPoint) => {
    setActiveModeId(point.modeId);
    setDrawerCollapsed(false);
    setMobileDrawerPosition("full");
    setDrawerView("point-detail");

    if (point.modeId === activeModeId) {
      modeState.selectPoint(point);
      return;
    }

    setPendingFavouriteSelection({ modeId: point.modeId, point });
  }, [activeModeId, modeState.selectPoint]);

  const playNextPoint = useCallback(() => {
    const nextPoint = getNextPlaybackPoint(playbackQueuePoints, audioPlayback.pointId);

    if (nextPoint) {
      void audioPlayback.play(nextPoint);
    }
  }, [audioPlayback, playbackQueuePoints]);

  const shufflePoint = useCallback(async () => {
    if (!activeMode.playback?.randomPointEndpoint) {
      return;
    }

    const randomPoint = await randomPlaybackPoint.takePoint();

    if (!randomPoint) {
      audioPlayback.reportError(activeMode.copy.randomPlaybackError);
      return;
    }

    await audioPlayback.play(randomPoint);
  }, [activeMode.copy.randomPlaybackError, activeMode.playback?.randomPointEndpoint, audioPlayback, randomPlaybackPoint]);

  return (
    <main
      className={`blomoon-shell ${drawerOpen ? "drawer-open" : "drawer-closed"} ${audioPlayback.point ? "has-mini-player" : ""}`}
      data-theme={activeTheme.id}
      onMouseMove={handleMouseMove}
    >
      <div className="globe-stage">
        <GlobeScene
          dpr={globeProfile.dpr}
          earthSpinEnabled={earthSpin.earthSpinEnabled && globeProfile.motionEnabled}
          focusKey={modeState.selectedId}
          hoverEnabled={globeProfile.hoverEnabled}
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

      <ShellChrome
        activeModeId={activeModeId}
        appConfig={appConfig}
        drawerView={drawerView}
        earthSpinEnabled={earthSpin.earthSpinEnabled}
        earthSpinDisabled={!globeProfile.motionEnabled}
        modes={terraModes}
        selectedThemeId={themeId}
        showListedOnGlobe={showListedOnGlobe}
        user={viewer.user}
        viewerLoading={viewer.loading}
        onAccountOpen={openAccountDrawer}
        onAccountUpdated={viewer.refresh}
        onAuthOpen={() => setAuthModalOpen(true)}
        onDesktopLogout={async () => {
          setThemeId(defaultTheme.id);
          await viewer.refresh();
          router.replace("/login");
          router.refresh();
        }}
        onFavouritesOpen={openFavourites}
        onHome={restoreHomeDrawer}
        onModeOpen={openModeSwitcher}
        onModeSelect={selectMode}
        onThemeChange={selectTheme}
        onToggleEarthSpin={earthSpin.toggleEarthSpin}
        onToggleShowListedOnGlobe={() => setShowListedOnGlobe((value) => !value)}
      />

      {globeProfile.hoverEnabled && hoveredPoint ? (
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
        activePlaybackPointKey={activePlaybackPointKey}
        accountContactLinks={appConfig.contactLinks}
        accountLoading={viewer.loading}
        collapsed={drawerCollapsed}
        detail={modeState.detail}
        detailAccessory={detailAccessory}
        favouritePointIds={favourites.favouriteIds}
        favouriteLists={favourites.lists}
        favouritesLoading={favourites.loading}
        hasMoreRemotePoints={modeState.hasMoreVisiblePoints}
        isLoadingDrawerTask={modeState.isLoadingDrawerTask}
        loading={modeState.listLoading}
        loadingTaskLabel={modeState.loadingTaskLabel}
        loadingMoreRemotePoints={modeState.loadingMoreVisiblePoints}
        mobilePosition={mobileDrawerPosition}
        modes={terraModes}
        points={modeState.visiblePoints}
        providerError={modeState.providerError}
        query={modeState.query}
        selectedCountry={selectedCountry}
        selectedId={modeState.selectedId}
        selectedThemeId={themeId}
        sortId={modeState.sortId}
        totalPoints={modeState.totalVisiblePoints}
        totalPointsKind={modeState.totalVisiblePointsKind}
        user={viewer.user}
        view={drawerView}
        onAccountUpdated={viewer.refresh}
        onCountryFilterChange={selectCountry}
        onClearCountrySelection={clearCountrySelection}
        onClearSelection={() => {
          modeState.clearSelection();
          setDrawerView("main");
          setMobileDrawerPosition("standard");
        }}
        onCreateFavouriteList={favourites.createList}
        onDeleteFavouriteList={favourites.deleteList}
        onFavouriteSelect={selectFavourite}
        onLoginOpen={() => setAuthModalOpen(true)}
        onLogoutRequest={() => setMobileLogoutConfirmOpen(true)}
        onLoadMoreRemotePoints={modeState.loadMoreVisiblePoints}
        onModeSelect={selectMode}
        onOpenAccountRoot={() => setDrawerView("account")}
        onOpenFavouritePicker={openFavouritePicker}
        onPointSelect={selectPoint}
        onQueryChange={updateQuery}
        onRemoveFavouriteFromList={favourites.removePointFromList}
        onRenameFavouriteList={favourites.renameList}
        onSetAccountView={setDrawerView}
        onSetMobilePosition={setMobileDrawerPosition}
        onSortChange={modeState.setSortId}
        onThemeChange={selectTheme}
        onToggleCollapsed={() => setDrawerCollapsed((value) => !value)}
      />

      {favouritePickerPoint ? (
        <FavouriteListPicker
          lists={favourites.lists}
          point={favouritePickerPoint}
          selectedListIds={favourites.getPointListIds(favouritePickerPoint)}
          onAddToList={favourites.addPointToList}
          onClose={() => setFavouritePickerPoint(null)}
          onCreateList={favourites.createList}
          onRemoveFromList={favourites.removePointFromList}
        />
      ) : null}

      {mobileLogoutConfirmOpen ? (
        <AccountModalShell
          description="This clears your active session on this device. Your saved lists and theme preference stay on your account."
          kicker="Session"
          title="Log out?"
          onClose={() => setMobileLogoutConfirmOpen(false)}
        >
          <div className="confirm-actions">
            <button
              className="primary-action danger-action"
              type="button"
              onClick={async () => {
                await authClient.signOut();
                setMobileLogoutConfirmOpen(false);
                setThemeId(defaultTheme.id);
                await viewer.refresh();
                router.replace("/login");
                router.refresh();
              }}
            >
              Log out
            </button>
            <button className="secondary-action" type="button" onClick={() => setMobileLogoutConfirmOpen(false)}>
              Not now
            </button>
          </div>
        </AccountModalShell>
      ) : null}

      <AuthModal
        googleAuthEnabled={appConfig.googleAuthEnabled}
        open={authModalOpen}
        serviceError={viewer.error}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={async () => {
          await viewer.refresh();
        }}
      />

      {activeMode.playback && audioPlayback.point ? (
        <AudioMiniPlayer
          canPlayNext={playbackQueuePoints.length > 0}
          canShuffle={Boolean(activeMode.playback.randomPointEndpoint)}
          itemPluralLabel={activeMode.copy.itemPlural}
          itemSingularLabel={activeMode.copy.itemSingular}
          loadingRandom={randomPlaybackPoint.loading && !randomPlaybackPoint.point}
          playback={audioPlayback}
          playbackLabel={activeMode.playback.label}
          onNext={playNextPoint}
          onPointOpen={openPlaybackPoint}
          onShuffle={() => {
            void shufflePoint();
          }}
        />
      ) : null}
    </main>
  );
}

function uniquePoints(points: TerraPoint[]) {
  const seen = new Set<string>();
  const result: TerraPoint[] = [];

  points.forEach((point) => {
    const key = getPointKey(point);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(point);
    }
  });

  return result;
}
