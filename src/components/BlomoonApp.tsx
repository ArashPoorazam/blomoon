"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { formatCoordinate, type CountryInfo } from "@/lib/geo";
import type { AppClientConfig } from "@/lib/app-config/types";
import { getPointKey } from "@/lib/modes/pointKeys";
import { defaultMode, getTerraMode, terraModes } from "@/lib/modes/registry";
import { getNextPlaybackPoint, type PlaybackQueueSource } from "@/lib/modes/playbackNavigation";
import type { TerraDataset, TerraModeId, TerraPoint } from "@/lib/modes/types";
import { useAudioPlayback } from "@/lib/modes/useAudioPlayback";
import { usePointDetail } from "@/lib/modes/usePointDetail";
import { useModeDataset } from "@/lib/modes/useModeDataset";
import { usePrefetchedRandomPoint } from "@/lib/modes/usePrefetchedRandomPoint";
import { authClient } from "@/lib/auth/client";
import {
  defaultTheme,
  getTerraTheme,
  type TerraThemeId
} from "@/lib/theme/themes";
import { ShellAccountOverlays } from "./account/ShellAccountOverlays";
import { useViewer } from "./account/useViewer";
import { AudioMiniPlayer, AudioPlaybackPanel } from "./AudioPlaybackPanel";
import { ButtonPressFeedback } from "./ButtonPressFeedback";
import { FavouriteOverlays } from "./favourites/FavouriteOverlays";
import { useFavouriteDrawerPoints } from "./favourites/useFavouriteDrawerPoints";
import { useFavouriteFolders } from "./favourites/useFavouriteFolders";
import { usePlaybackHistory } from "./history/usePlaybackHistory";
import { GlobeViewport, type GlobeViewportHandle } from "./globe/GlobeViewport";
import { useCrosshairPreference } from "./globe/useCrosshairPreference";
import { useCameraFocusRequest } from "./globe/useCameraFocusRequest";
import { useDisplayedGlobePoints } from "./globe/useDisplayedGlobePoints";
import { useEarthSpinControls } from "./globe/useEarthSpinControls";
import { useGlobeProfile } from "./globe/useGlobeProfile";
import { ShellChrome } from "./shell/ShellChrome";
import { useDrawerNavigation } from "./shell/useDrawerNavigation";
import { SideDrawer } from "./SideDrawer";
import { usePointInteractions } from "./usePointInteractions";
import { getDrawerPointSource, getListContextEntry, usePointSources } from "./usePointSources";

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
  const [playbackQueueSource, setPlaybackQueueSource] = useState<PlaybackQueueSource>("list");
  const [favouritePickerPoint, setFavouritePickerPoint] = useState<TerraPoint | null>(null);
  const [stationSharePoint, setStationSharePoint] = useState<TerraPoint | null>(null);
  const [mobileLogoutConfirmOpen, setMobileLogoutConfirmOpen] = useState(false);
  const shellRef = useRef<HTMLElement>(null);
  const globeRef = useRef<GlobeViewportHandle>(null);
  const crosshair = useCrosshairPreference();
  const clearCrosshairPoint = useCallback(() => globeRef.current?.clearPreview(), []);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeMode = getTerraMode(activeModeId);
  const activeTheme = getTerraTheme(themeId);
  const globeProfile = useGlobeProfile();
  const { focusPoint, request: cameraFocusRequest } = useCameraFocusRequest();
  const earthSpin = useEarthSpinControls(globeProfile.motionEnabled);
  const viewer = useViewer();
  const modeState = useModeDataset(activeMode, selectedCountry?.code ?? null, initialDatasets?.[activeMode.id],
    viewer.loading ? "loading" : viewer.user?.id ?? "guest");
  const pointDetail = usePointDetail(activeMode, drawer.view === "point-detail" ? modeState.selectedPoint : null);
  const playbackHistory = usePlaybackHistory(viewer.user?.id ?? null);
  const audioPlayback = useAudioPlayback(activeMode.playback ?? null, playbackHistory.record);
  const randomPlaybackPoint = usePrefetchedRandomPoint({
    enabled: Boolean(activeMode.playback?.randomPointEndpoint),
    endpoint: activeMode.playback?.randomPointEndpoint,
    excludePointId: audioPlayback.pointId,
    prefetchEnabled: modeState.listSettled
  });
  const favourites = useFavouriteFolders({
    user: viewer.user,
    onAuthRequired: () => setAuthModalOpen(true)
  });
  const recordPointInteraction = useCallback((point: TerraPoint) => {
    const mode = getTerraMode(point.modeId);

    if (viewer.user && mode.clickEndpoint) {
      void fetch(mode.clickEndpoint(point.id), { method: "POST" });
    }
  }, [viewer.user]);
  const openPointDetail = useCallback((point: TerraPoint) => {
    drawer.open({ kind: "point-detail", modeId: point.modeId, pointId: point.id });
  }, [drawer.open]);
  const {
    inspect: inspectPoint,
    play: playPoint,
    playInPlace: playPointInPlace
  } = usePointInteractions({
    activeModeId,
    focusPoint,
    openPointDetail,
    playPoint: audioPlayback.play,
    recordPointInteraction,
    selectPoint: modeState.selectPoint,
    setActiveModeId,
    setPlaybackQueueSource
  });
  const drawerOpen = !drawer.collapsed && drawer.mobilePosition !== "closed";
  const crosshairVisible = crosshair.enabled && globeProfile.profile === "mobile" && drawer.mobilePosition !== "full";
  const hasMiniPlayer = Boolean(activeMode.playback);
  const favouritePoints = useFavouriteDrawerPoints({ activeFolder: favourites.activeFolder,
    entry: getListContextEntry(drawer.stack), points: favourites.points });
  const historyState = playbackHistory.getState(activeModeId);
  const historyPoints = useMemo(() => historyState.items.map((item) => item.point), [historyState.items]);
  const drawerSource = getDrawerPointSource(drawer.stack);
  const { drawerListsPoints, listedPoints, playbackQueuePoints } = usePointSources({
    activeModeId,
    drawerSource,
    favouritePoints,
    historyPoints,
    listPoints: modeState.visiblePoints,
    queueSource: playbackQueueSource
  });
  const activePlaybackPointKey = audioPlayback.point && (audioPlayback.status === "playing" || audioPlayback.status === "buffering" || audioPlayback.status === "paused")
    ? getPointKey(audioPlayback.point)
    : null;
  const activePlaybackPoint = activePlaybackPointKey ? audioPlayback.point : null;
  const playFromList = useCallback((point: TerraPoint) => playPoint(point, "list"), [playPoint]);
  const playFromFavourites = useCallback((point: TerraPoint) => playPoint(point, "favourites"), [playPoint]);
  const playFromHistory = useCallback((point: TerraPoint) => playPoint(point, "history"), [playPoint]);
  const playFromCurrentDrawer = useCallback((point: TerraPoint) => {
    playPoint(point, drawerSource ?? "list");
  }, [drawerSource, playPoint]);
  const playInPlaceFromCurrentDrawer = useCallback((point: TerraPoint) => {
    playPointInPlace(point, drawerSource ?? "list");
  }, [drawerSource, playPointInPlace]);
  const toggleEarthSpin = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    clearCrosshairPoint();
    earthSpin.toggleEarthSpin(event);
  }, [clearCrosshairPoint, earthSpin.toggleEarthSpin]);
  const displayedGlobe = useDisplayedGlobePoints({
    activeMode,
    activePlaybackPoint,
    activeTheme,
    globeProfile,
    listedPoints,
    modeGlobePoints: modeState.globePoints,
    modeSelectedPoint: modeState.selectedPoint,
    showListedOnGlobe
  });
  const openFavouritePicker = useCallback((point: TerraPoint) => {
    if (!viewer.user) {
      setAuthModalOpen(true);
      return;
    }

    setFavouritePickerPoint(point);
    void favourites.loadPoints();
  }, [favourites.loadPoints, viewer.user]);
  const detailAccessory =
    activeMode.playback && pointDetail ? (
      <AudioPlaybackPanel
        detail={pointDetail}
        favourited={favourites.favouriteIds.has(getPointKey(pointDetail))}
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

  const selectCountry = useCallback((country: CountryInfo | null) => {
    const nextCountry = country?.code === selectedCountry?.code ? null : country;
    setSelectedCountry(nextCountry);
    drawer.replaceContent("main");
    setPlaybackQueueSource("list");
    setHoveredPoint(null);
    clearCrosshairPoint();
  }, [clearCrosshairPoint, drawer.replaceContent, selectedCountry?.code]);

  const openFavourites = useCallback(() => {
    modeState.clearSelection();
    drawer.replace("favourites");
    setPlaybackQueueSource("favourites");
    void favourites.loadPoints();
    clearCrosshairPoint();
  }, [clearCrosshairPoint, drawer.replace, favourites.loadPoints, modeState.clearSelection]);

  const openHistory = useCallback(() => {
    modeState.clearSelection();
    drawer.replace("history");
    setPlaybackQueueSource("history");
    void playbackHistory.load(activeModeId);
    clearCrosshairPoint();
  }, [activeModeId, clearCrosshairPoint, drawer.replace, modeState.clearSelection, playbackHistory.load]);

  const openFavouriteFolder = useCallback((folderId: string) => {
    drawer.open({ kind: "favourite-folder", folderId });
    void favourites.loadFolder(folderId);
    setPlaybackQueueSource("favourites");
  }, [drawer.open, favourites.loadFolder]);

  const openModeSwitcher = useCallback(() => {
    modeState.clearSelection();
    drawer.replace("mode-switcher");
    clearCrosshairPoint();
  }, [clearCrosshairPoint, drawer.replace, modeState.clearSelection]);

  const openAccountDrawer = useCallback(() => {
    modeState.clearSelection();
    drawer.replace("account");
    clearCrosshairPoint();
  }, [clearCrosshairPoint, drawer.replace, modeState.clearSelection]);

  const restoreHomeDrawer = useCallback(() => {
    modeState.clearSelection();
    drawer.replace("main");
    setPlaybackQueueSource("list");
    clearCrosshairPoint();
  }, [clearCrosshairPoint, drawer.replace, modeState.clearSelection]);

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

  const selectMode = useCallback((modeId: TerraModeId) => {
    setActiveModeId(modeId);
    drawer.replace("main");
    setPlaybackQueueSource("list");
    setHoveredPoint(null);
    clearCrosshairPoint();
  }, [clearCrosshairPoint, drawer.replace]);

  const goBackDrawer = useCallback(() => {
    if (drawer.view === "point-detail") {
      modeState.clearSelection();
      clearCrosshairPoint();
    }

    drawer.goBack();
  }, [clearCrosshairPoint, drawer.goBack, drawer.view, modeState.clearSelection]);

  const playNextPoint = useCallback(() => {
    const nextPoint = getNextPlaybackPoint(playbackQueuePoints, audioPlayback.pointId);

    if (nextPoint) {
      playPoint(nextPoint, playbackQueueSource);
    }
  }, [audioPlayback.pointId, playbackQueuePoints, playbackQueueSource, playPoint]);

  const shufflePoint = useCallback(async () => {
    if (!activeMode.playback?.randomPointEndpoint) {
      return;
    }

    const randomPoint = await randomPlaybackPoint.takePoint();

    if (!randomPoint) {
      audioPlayback.reportError(activeMode.copy.randomPlaybackError);
      return;
    }

    playPoint(randomPoint, "list");
  }, [activeMode.copy.randomPlaybackError, activeMode.playback?.randomPointEndpoint, audioPlayback, playPoint, randomPlaybackPoint]);

  return (
    <main
      ref={shellRef}
      className={`blomoon-shell ${drawerOpen ? "drawer-open" : "drawer-closed"} ${hasMiniPlayer ? "has-mini-player" : ""}`}
      data-mobile-drawer-position={drawer.mobilePosition}
      data-theme={activeTheme.id}
      onMouseMove={handleMouseMove}
    >
      <ButtonPressFeedback rootRef={shellRef} />

      <GlobeViewport
        ref={globeRef}
        playbackStatus={audioPlayback.status}
        playbackPoint={audioPlayback.point}
        onInspect={inspectPoint}
        onPause={audioPlayback.pause}
        onPlayInPlace={playInPlaceFromCurrentDrawer}
        activePlaybackPoint={displayedGlobe.activePlaybackPoint}
        crosshairEnabled={crosshairVisible}
        fitViewport={globeProfile.profile === "mobile"}
        dpr={globeProfile.dpr}
        earthSpinEnabled={earthSpin.earthSpinEnabled && globeProfile.motionEnabled}
        focusKey={cameraFocusRequest?.key ?? null}
        focusPoint={cameraFocusRequest?.point ?? null}
        hoverEnabled={globeProfile.hoverEnabled}
        markerColor={displayedGlobe.markerColor}
        markerColorMode={displayedGlobe.markerColorMode}
        motionEnabled={globeProfile.motionEnabled}
        points={displayedGlobe.points}
        selectedCountryCode={selectedCountry?.code ?? null}
        selectedCountryOutlineColor={displayedGlobe.selectedCountryOutlineColor}
        selectedPoint={displayedGlobe.selectedPoint}
        theme={activeTheme.globe}
        onCountrySelect={selectCountry}
        onPointHover={setHoveredPoint}
        onPointSelect={playFromCurrentDrawer}
      />

      <ShellChrome
        crosshairEnabled={crosshair.enabled}
        onToggleCrosshair={crosshair.toggle}
        listedPointsDisabled={!drawerListsPoints}
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
        onHistoryOpen={openHistory}
        onHome={restoreHomeDrawer}
        onModeOpen={openModeSwitcher}
        onModeSelect={selectMode}
        onThemeChange={selectTheme}
        onToggleEarthSpin={toggleEarthSpin}
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
        detail={pointDetail}
        detailAccessory={detailAccessory}
        favouritePointIds={favourites.favouriteIds}
        activeFavouriteFolder={favourites.activeFolder}
        favouriteFolders={favourites.folders}
        favouriteFolderLoading={favourites.folderLoading}
        favouritesLoading={favourites.loading}
        hasMoreRemotePoints={modeState.hasMoreVisiblePoints}
        history={historyState}
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
        shellRef={shellRef}
        sortId={modeState.sortId}
        suggestionTitle={modeState.suggested ? (modeState.recommendation?.kind === "personalized" ? activeMode.recommendations?.label : "Discover stations") : undefined}
        catalogTotal={modeState.catalogTotal}
        totalPoints={modeState.totalVisiblePoints}
        totalPointsKind={modeState.totalVisiblePointsKind}
        user={viewer.user}
        view={drawer.view}
        entry={drawer.entry}
        onAccountUpdated={viewer.refresh}
        onCountryFilterChange={selectCountry}
        onClearCountrySelection={clearCountrySelection}
        onCreateFavouriteFolder={favourites.createFolder}
        onDeleteFavouriteFolder={favourites.deleteFolder}
        onOpenFavouriteFolder={openFavouriteFolder}
        onLoginOpen={() => setAuthModalOpen(true)}
        onLogoutRequest={() => setMobileLogoutConfirmOpen(true)}
        onLoadMoreRemotePoints={modeState.loadMoreVisiblePoints}
        onModeSelect={selectMode}
        onBack={goBackDrawer}
        onOpenFavouritePicker={openFavouritePicker}
        onPointInspect={inspectPoint}
        onPointPlay={playFromList}
        onPointShare={setStationSharePoint}
        onQueryChange={updateQuery}
        onRemoveFavouriteFromFolder={favourites.removePointFromFolder}
        onShareFavouriteFolder={favourites.shareFolder}
        onUpdateFavouriteFolder={favourites.updateFolder}
        onSetAccountView={(view) => drawer.open({ kind: view })}
        onSetMobilePosition={drawer.setMobilePosition}
        onSortChange={modeState.setSortId}
        onThemeChange={selectTheme}
        onToggleCollapsed={drawer.toggleCollapsed}
        onFavouritePointInspect={inspectPoint}
        onFavouritePointPlay={playFromFavourites}
        onHistoryPointPlay={playFromHistory}
        onHistoryRetry={() => void playbackHistory.load(activeModeId)}
      />

      <FavouriteOverlays favourites={favourites} pickerPoint={favouritePickerPoint} sharePoint={stationSharePoint} onCleanUrl={() => router.replace("/")} onClosePicker={() => setFavouritePickerPoint(null)} onCloseShare={() => setStationSharePoint(null)} onOpenFolder={openFavouriteFolder} onStationEntry={inspectPoint} />

      <ShellAccountOverlays authOpen={authModalOpen} googleAuthEnabled={appConfig.googleAuthEnabled} logoutOpen={mobileLogoutConfirmOpen} serviceError={viewer.error} onAuthenticated={viewer.refresh} onAuthClose={() => setAuthModalOpen(false)} onLogoutClose={() => setMobileLogoutConfirmOpen(false)} onLogoutConfirm={async () => {
        await authClient.signOut(); setMobileLogoutConfirmOpen(false); setThemeId(defaultTheme.id); await viewer.refresh(); router.replace("/login"); router.refresh();
      }} />

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
          onPointOpen={inspectPoint}
          onShuffle={() => {
            void shufflePoint();
          }}
        />
      ) : null}
    </main>
  );
}
