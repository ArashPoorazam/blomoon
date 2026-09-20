"use client";

import { useState, type MouseEvent } from "react";
import type { AppClientConfig } from "@/lib/app-config/types";
import type { TerraMode, TerraModeId } from "@/lib/modes/types";
import type { TerraThemeId } from "@/lib/theme/themes";
import type { ViewerDto } from "@/lib/users/dto";
import { AccountMenu } from "../account/AccountMenu";
import { ShellControlRail } from "../ShellControlRail";
import type { ShellDrawerView } from "./drawerState";
import { ShellGlobeControls } from "./ShellGlobeControls";
import { ModalShell } from "../ui/ModalShell";
import { ModeSwitcherOptions } from "./ModeSwitcherDrawer";
import { ShellMobileNav } from "./ShellMobileNav";

import type { MainDrawer } from "./mainDrawerNavigation";
import type { DrawerMotion } from "../drawer/useDrawerTransition";

type ShellChromeProps = {
  drawerMotion: DrawerMotion;
  onMainDrawerNavigate: (target: MainDrawer) => void;
  crosshairEnabled: boolean;
  onToggleCrosshair: () => void;
  listedPointsDisabled: boolean;
  activeMode: TerraMode;
  activeModeId: TerraModeId;
  appConfig: AppClientConfig;
  drawerView: ShellDrawerView;
  earthSpinDisabled: boolean;
  earthSpinEnabled: boolean;
  modes: TerraMode[];
  selectedThemeId: TerraThemeId;
  showListedOnGlobe: boolean;
  user: ViewerDto | null;
  viewerLoading: boolean;
  onAccountUpdated: () => void | Promise<void>;
  onAuthOpen: () => void;
  onDesktopLogout: () => void | Promise<void>;
  onFavouritesOpen: () => void;
  onHistoryOpen: () => void;
  onModeSelect: (modeId: TerraModeId) => void;
  onThemeChange: (themeId: TerraThemeId) => void;
  onToggleEarthSpin: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggleShowListedOnGlobe: () => void;
};

export function ShellChrome({
  drawerMotion,
  onMainDrawerNavigate,
  crosshairEnabled,
  onToggleCrosshair,
  listedPointsDisabled,
  activeMode,
  activeModeId,
  appConfig,
  drawerView,
  earthSpinDisabled,
  earthSpinEnabled,
  modes,
  onAccountUpdated,
  onAuthOpen,
  onDesktopLogout,
  onFavouritesOpen,
  onHistoryOpen,
  onModeSelect,
  onThemeChange,
  onToggleEarthSpin,
  onToggleShowListedOnGlobe,
  selectedThemeId,
  showListedOnGlobe,
  user,
  viewerLoading
}: ShellChromeProps) {
  const [modeSwitcherOpen, setModeSwitcherOpen] = useState(false);
  return (
    <>
      <AccountMenu
        contactLinks={appConfig.contactLinks}
        loading={viewerLoading}
        selectedThemeId={selectedThemeId}
        user={user}
        onAccountUpdated={onAccountUpdated}
        onAuthOpen={onAuthOpen}
        onLogout={onDesktopLogout}
        onThemeChange={onThemeChange}
      />

      <ShellMobileNav
        activeMode={activeMode}
        activeView={drawerView}
        motion={drawerMotion}
        onNavigate={onMainDrawerNavigate}
      />

      <ShellControlRail
        activeMode={activeMode}
        activeView={drawerView}
        modeSwitcherOpen={modeSwitcherOpen}
        onOpenFavourites={onFavouritesOpen}
        onOpenHistory={onHistoryOpen}
        onOpenModeSwitcher={() => setModeSwitcherOpen(true)}
      />
      {modeSwitcherOpen ? <ModalShell title="Change mode" subtitle="Choose how you explore the world."
        onClose={() => setModeSwitcherOpen(false)}>
        <ModeSwitcherOptions activeModeId={activeModeId} modes={modes} onModeSelect={(modeId) => {
          setModeSwitcherOpen(false);
          onModeSelect(modeId);
        }} />
      </ModalShell> : null}

      <ShellGlobeControls
        crosshairEnabled={crosshairEnabled}
        onToggleCrosshair={onToggleCrosshair}
        listedPointsDisabled={listedPointsDisabled}
        earthSpinEnabled={earthSpinEnabled}
        earthSpinDisabled={earthSpinDisabled}
        showListedOnGlobe={showListedOnGlobe}
        onToggleEarthSpin={onToggleEarthSpin}
        onToggleShowListedOnGlobe={onToggleShowListedOnGlobe}
      />
    </>
  );
}
