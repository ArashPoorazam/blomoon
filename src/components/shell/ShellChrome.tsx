"use client";

import type { MouseEvent } from "react";
import type { AppClientConfig } from "@/lib/app-config/types";
import type { TerraMode, TerraModeId } from "@/lib/modes/types";
import type { TerraThemeId } from "@/lib/theme/themes";
import type { ViewerDto } from "@/lib/users/dto";
import { AccountMenu } from "../account/AccountMenu";
import { ShellControlRail } from "../ShellControlRail";
import type { ShellDrawerView } from "./drawerState";
import { ShellGlobeControls } from "./ShellGlobeControls";
import { ShellMobileNav } from "./ShellMobileNav";

type ShellChromeProps = {
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
  onAccountOpen: () => void;
  onAccountUpdated: () => void | Promise<void>;
  onAuthOpen: () => void;
  onDesktopLogout: () => void | Promise<void>;
  onFavouritesOpen: () => void;
  onHistoryOpen: () => void;
  onHome: () => void;
  onModeOpen: () => void;
  onModeSelect: (modeId: TerraModeId) => void;
  onThemeChange: (themeId: TerraThemeId) => void;
  onToggleEarthSpin: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggleShowListedOnGlobe: () => void;
};

export function ShellChrome({
  listedPointsDisabled,
  activeMode,
  activeModeId,
  appConfig,
  drawerView,
  earthSpinDisabled,
  earthSpinEnabled,
  modes,
  onAccountOpen,
  onAccountUpdated,
  onAuthOpen,
  onDesktopLogout,
  onFavouritesOpen,
  onHistoryOpen,
  onHome,
  onModeOpen,
  onModeSelect,
  onThemeChange,
  onToggleEarthSpin,
  onToggleShowListedOnGlobe,
  selectedThemeId,
  showListedOnGlobe,
  user,
  viewerLoading
}: ShellChromeProps) {
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
        onAccountOpen={onAccountOpen}
        onFavouritesOpen={onFavouritesOpen}
        onHistoryOpen={onHistoryOpen}
        onHome={onHome}
        onModeOpen={onModeOpen}
      />

      <ShellControlRail
        listedPointsDisabled={listedPointsDisabled}
        activeModeId={activeModeId}
        activeView={drawerView}
        earthSpinEnabled={earthSpinEnabled}
        earthSpinDisabled={earthSpinDisabled}
        modes={modes}
        showListedOnGlobe={showListedOnGlobe}
        onOpenFavourites={onFavouritesOpen}
        onOpenHistory={onHistoryOpen}
        onModeSelect={onModeSelect}
        onToggleEarthSpin={onToggleEarthSpin}
        onToggleShowListedOnGlobe={onToggleShowListedOnGlobe}
      />

      <ShellGlobeControls
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
