"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { formatCoordinate, type CountryInfo } from "@/lib/geo";
import type { AppClientConfig } from "@/lib/app-config/types";
import { uniquePoints } from "@/lib/modes/pointCollections";
import { getPointKey } from "@/lib/modes/pointKeys";
import { defaultMode, getTerraMode, terraModes } from "@/lib/modes/registry";
import { getNextPlaybackPoint } from "@/lib/modes/playbackNavigation";
import type { TerraDataset, TerraModeId, TerraPoint } from "@/lib/modes/types";
import { useAudioPlayback } from "@/lib/modes/useAudioPlayback";
import { useModeDataset } from "@/lib/modes/useModeDataset";
import { usePrefetchedRandomPoint } from "@/lib/modes/usePrefetchedRandomPoint";
import { authClient } from "@/lib/auth/client";
import {
  defaultTheme,
  getTerraTheme,
  type TerraThemeId
} from "@/lib/theme/themes";
import { AuthModal } from "./account/AuthModal";
import { MobileLogoutConfirm } from "./account/MobileLogoutConfirm";
import { useViewer } from "./account/useViewer";
import { AudioMiniPlayer, AudioPlaybackPanel } from "./AudioPlaybackPanel";
import { FavouriteListPicker } from "./favourites/FavouriteListPicker";
import { useFavourites } from "./favourites/useFavourites";
import { GlobeScene } from "./GlobeScene";
import { useCameraFocusRequest } from "./globe/useCameraFocusRequest";
import { useDisplayedGlobePoints } from "./globe/useDisplayedGlobePoints";
import { useEarthSpinControls } from "./globe/useEarthSpinControls";
import { useGlobeProfile } from "./globe/useGlobeProfile";
import { ShellChrome } from "./shell/ShellChrome";
import { useDrawerNavigation } from "./shell/useDrawerNavigation";
import { SideDrawer } from "./SideDrawer";

type BlomoonAppProps = { appConfig: AppClientConfig; initialDatasets?: Partial<Record<TerraModeId, TerraDataset>> };

export function BlomoonApp({ appConfig, initialDatasets }: BlomoonAppProps) {
  const router = useRouter();
  const [activeModeId, setActiveModeId] = useState<TerraModeId>(defaultMode.id);
  const drawer = useDrawerNavigation();
  const [hoveredPoint, setHoveredPoint] = useState<TerraPoint | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [showListedOnGlobe, setShowListedOnGlobe] = useState(false);
  const [themeId, setThemeId] = useState<TerraThemeId>(defaultTheme.id);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [playbackQueueSource, setPlaybackQueueSource] = useState<"list" | "favourites">("list");
  const [pendingFavouriteSelection, setPendingFavouriteSelection] = useState<{ modeId: TerraModeId; point: TerraPoint } | null>(null);
  const [pendingPlaybackSelection, setPendingPlaybackSelection] = useState<{ modeId: TerraModeId; point: TerraPoint } | null>(null);
  const [favouritePickerPoint, setFavouritePickerPoint] = useState<TerraPoint | null>(null);
  const [mobileLogoutConfirmOpen, setMobileLogoutConfirmOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeMode = getTerraMode(activeModeId);
  const activeTheme = getTerraTheme(themeId);
  const globeProfile = useGlobeProfile();
  const { focusPoint, request: cameraFocusRequest } = useCameraFocusRequest();
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
  const drawerOpen = !drawer.collapsed && drawer.mobilePosition !== "closed";
  const hasMiniPlayer = Boolean(activeMode.playback);
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
  const playbackQueuePoints = playbackQueueSource === "favourites" ? activeModeFavouritePoints : modeState.visiblePoints;
  const activePlaybackPointKey = audioPlayback.point && (audioPlayback.status === "playing" || audioPlayback.status === "paused")
    ? getPointKey(audioPlayback.point)
    : null;
  const activePlaybackPoint = activePlaybackPointKey ? audioPlayback.point : null;
  const displayedGlobe = useDisplayedGlobePoints({
    activeMode,
    activePlaybackPoint,
    activeTheme,
    drawerView: drawer.view,
    favouritePoints,
    globeProfile,
    modeGlobePoints: modeState.globePoints,
    modeSelectedId: modeState.selectedId,
    modeSelectedPoint: modeState.selectedPoint,
    modeVisiblePoints: modeState.visiblePoints,
    showListedOnGlobe
  });
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
    focusPoint(pendingFavouriteSelection.point);
    setPendingFavouriteSelection(null);
  }, [activeModeId, focusPoint, modeState.selectPoint, pendingFavouriteSelection]);

  useEffect(() => {
    if (!pendingPlaybackSelection || pendingPlaybackSelection.modeId !== activeModeId) {
      return;
    }

    void audioPlayback.play(pendingPlaybackSelection.point);
    focusPoint(pendingPlaybackSelection.point);
    setPendingPlaybackSelection(null);
  }, [activeModeId, audioPlayback, focusPoint, pendingPlaybackSelection]);

  const recordPointInteraction = useCallback((point: TerraPoint) => {
    const mode = getTerraMode(point.modeId);

    if (viewer.user && mode.clickEndpoint) {
      void fetch(mode.clickEndpoint(point.id), { method: "POST" });
    }
  }, [viewer.user]);

  const selectPointForDetail = useCallback((point: TerraPoint) => {
    focusPoint(point);

    if (point.modeId !== activeModeId) {
      setActiveModeId(point.modeId);
      setPendingFavouriteSelection({ modeId: point.modeId, point });
    } else {
      modeState.selectPoint(point);
    }

    drawer.openContent("point-detail");
  }, [activeModeId, drawer, focusPoint, modeState.selectPoint]);

  const startPointPlayback = useCallback((point: TerraPoint) => {
    if (point.modeId !== activeModeId) {
      setActiveModeId(point.modeId);
      setPendingPlaybackSelection({ modeId: point.modeId, point });
      return;
    }

    void audioPlayback.play(point);
  }, [activeModeId, audioPlayback]);

  const inspectPoint = useCallback((point: TerraPoint) => {
    selectPointForDetail(point);
    recordPointInteraction(point);
  }, [recordPointInteraction, selectPointForDetail]);

  const playPoint = useCallback((point: TerraPoint, source: "list" | "favourites") => {
    setPlaybackQueueSource(source);
    focusPoint(point);
    recordPointInteraction(point);
    startPointPlayback(point);
  }, [focusPoint, recordPointInteraction, startPointPlayback]);

  const activateGlobePoint = useCallback((point: TerraPoint) => {
    setPlaybackQueueSource(drawer.view === "favourites" ? "favourites" : "list");
    selectPointForDetail(point);
    recordPointInteraction(point);
    startPointPlayback(point);
  }, [drawer.view, recordPointInteraction, selectPointForDetail, startPointPlayback]);

  const selectCountry = useCallback((country: CountryInfo | null) => {
    const nextCountry = country?.code === selectedCountry?.code ? null : country;
    setSelectedCountry(nextCountry);
    drawer.replaceContent("main");
    setPlaybackQueueSource("list");
    setHoveredPoint(null);
  }, [drawer, selectedCountry?.code]);

  const openFavourites = useCallback(() => {
    modeState.clearSelection();
    drawer.replace("favourites", "standard");
    setPlaybackQueueSource("favourites");
  }, [drawer, modeState.clearSelection]);

  const openModeSwitcher = useCallback(() => {
    modeState.clearSelection();
    drawer.replace("mode-switcher", "standard");
  }, [drawer, modeState.clearSelection]);

  const openAccountDrawer = useCallback(() => {
    modeState.clearSelection();
    drawer.replace("account", "standard");
  }, [drawer, modeState.clearSelection]);

  const restoreHomeDrawer = useCallback(() => {
    modeState.clearSelection();
    drawer.replace("main", "standard");
    setPlaybackQueueSource("list");
  }, [drawer, modeState.clearSelection]);

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
  }, [modeState.setQuery]);

  const handleMouseMove = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (tooltipRef.current) {
      tooltipRef.current.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`;
    }
  }, []);

  const selectFavourite = useCallback((modeId: TerraModeId, point: TerraPoint) => {
    setActiveModeId(modeId);
    focusPoint(point);
    setPendingFavouriteSelection({ modeId, point });
    setPlaybackQueueSource("favourites");
    drawer.openContent("point-detail");
  }, [drawer, focusPoint]);

  const selectMode = useCallback((modeId: TerraModeId) => {
    setActiveModeId(modeId);
    drawer.replace("main", "standard");
    setPlaybackQueueSource("list");
    setHoveredPoint(null);
  }, [drawer]);

  const openPlaybackPoint = useCallback((point: TerraPoint) => {
    focusPoint(point);
    setActiveModeId(point.modeId);
    drawer.openContent("point-detail");

    if (point.modeId === activeModeId) {
      modeState.selectPoint(point);
      return;
    }

    setPendingFavouriteSelection({ modeId: point.modeId, point });
  }, [activeModeId, drawer, focusPoint, modeState.selectPoint]);

  const goBackDrawer = useCallback(() => {
    if (drawer.view === "point-detail") {
      modeState.clearSelection();
    }

    drawer.goBack();
  }, [drawer, modeState.clearSelection]);

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
      className={`blomoon-shell ${drawerOpen ? "drawer-open" : "drawer-closed"} ${hasMiniPlayer ? "has-mini-player" : ""}`}
      data-theme={activeTheme.id}
      onMouseMove={handleMouseMove}
    >
      <div className="globe-stage">
        <GlobeScene
          activePlaybackPoint={activePlaybackPoint}
          dpr={globeProfile.dpr}
          earthSpinEnabled={earthSpin.earthSpinEnabled && globeProfile.motionEnabled}
          focusKey={cameraFocusRequest?.key ?? null}
          focusPoint={cameraFocusRequest?.point ?? null}
          hoverEnabled={globeProfile.hoverEnabled}
          maxCameraDistance={globeProfile.maxCameraDistance}
          markerColor={displayedGlobe.markerColor}
          markerColorMode={displayedGlobe.markerColorMode}
          points={displayedGlobe.points}
          selectedCountryCode={selectedCountry?.code ?? null}
          selectedCountryOutlineColor={displayedGlobe.selectedCountryOutlineColor}
          selectedPoint={displayedGlobe.selectedPoint}
          theme={activeTheme.globe}
          onCountrySelect={selectCountry}
          onPointHover={setHoveredPoint}
          onPointSelect={activateGlobePoint}
        />
      </div>

      <ShellChrome
        activeMode={activeMode}
        activeModeId={activeModeId}
        appConfig={appConfig}
        drawerView={drawer.view}
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
        onModeListOpen={restoreHomeDrawer}
        onModeOpen={openModeSwitcher}
        onModeSelect={selectMode}
        onThemeChange={selectTheme}
        onToggleEarthSpin={earthSpin.toggleEarthSpin}
        onToggleShowListedOnGlobe={() => setShowListedOnGlobe((value) => !value)}
      />

      {globeProfile.hoverEnabled && hoveredPoint ? (
        <div ref={tooltipRef} className="point-tooltip">
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
        canGoBack={drawer.canGoBack}
        collapsed={drawer.collapsed}
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
        mobilePosition={drawer.mobilePosition}
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
        view={drawer.view}
        onAccountUpdated={viewer.refresh}
        onCountryFilterChange={selectCountry}
        onClearCountrySelection={clearCountrySelection}
        onCreateFavouriteList={favourites.createList}
        onDeleteFavouriteList={favourites.deleteList}
        onLoginOpen={() => setAuthModalOpen(true)}
        onLogoutRequest={() => setMobileLogoutConfirmOpen(true)}
        onLoadMoreRemotePoints={modeState.loadMoreVisiblePoints}
        onModeSelect={selectMode}
        onBack={goBackDrawer}
        onOpenFavouritePicker={openFavouritePicker}
        onPointInspect={inspectPoint}
        onPointPlay={(point) => playPoint(point, "list")}
        onQueryChange={updateQuery}
        onRemoveFavouriteFromList={favourites.removePointFromList}
        onRenameFavouriteList={favourites.renameList}
        onSetAccountView={(view) => drawer.open(view, "standard")}
        onSetMobilePosition={drawer.setMobilePosition}
        onSortChange={modeState.setSortId}
        onThemeChange={selectTheme}
        onToggleCollapsed={drawer.toggleCollapsed}
        onFavouritePointInspect={selectFavourite}
        onFavouritePointPlay={(modeId, point) => playPoint(point, "favourites")}
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
        <MobileLogoutConfirm
          onClose={() => setMobileLogoutConfirmOpen(false)}
          onConfirm={async () => {
            await authClient.signOut();
            setMobileLogoutConfirmOpen(false);
            setThemeId(defaultTheme.id);
            await viewer.refresh();
            router.replace("/login");
            router.refresh();
          }}
        />
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

      {activeMode.playback ? (
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
