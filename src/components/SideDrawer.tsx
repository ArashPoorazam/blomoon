"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import type { ContactLink } from "@/lib/app-config/types";
import type { CountryInfo } from "@/lib/geo";
import type { TerraMode, TerraModeId, TerraPoint, TerraPointDetail } from "@/lib/modes/types";
import type { FavouriteListDto } from "@/lib/persistence/types";
import type { TerraThemeId } from "@/lib/theme/themes";
import type { ViewerDto } from "@/lib/users/dto";
import { MobileDrawerHandle } from "./drawer/MobileDrawerHandle";
import { PointDetailDrawer } from "./drawer/PointDetailDrawer";
import { FavouritesDrawer } from "./favourites/FavouritesDrawer";
import { AccountDrawer } from "./shell/AccountDrawer";
import type { DrawerMobilePosition, ShellDrawerView } from "./shell/drawerState";
import { ModeSwitcherDrawer } from "./shell/ModeSwitcherDrawer";
import { SideDrawerList } from "./SideDrawerList";

type SideDrawerProps = {
  activeMode: TerraMode;
  activeModeId: TerraModeId;
  activePlaybackPointKey: string | null;
  accountContactLinks: ContactLink[];
  accountLoading: boolean;
  canGoBack: boolean;
  collapsed: boolean;
  detail: TerraPointDetail | null;
  detailAccessory?: ReactNode;
  favouritePointIds: Set<string>;
  favouriteLists: FavouriteListDto[];
  favouritesLoading: boolean;
  hasMoreRemotePoints?: boolean;
  isLoadingDrawerTask: boolean;
  loading: boolean;
  loadingTaskLabel: string;
  loadingMoreRemotePoints?: boolean;
  mobilePosition: DrawerMobilePosition;
  modes: TerraMode[];
  points: TerraPoint[];
  providerError: string | null;
  query: string;
  selectedCountry: CountryInfo | null;
  selectedId: string | null;
  selectedThemeId: TerraThemeId;
  shellRef: RefObject<HTMLElement | null>;
  sortId: string;
  totalPoints: number;
  totalPointsKind: "exact" | "lowerBound";
  user: ViewerDto | null;
  view: ShellDrawerView;
  onAccountUpdated: () => void | Promise<void>;
  onCountryFilterChange: (country: CountryInfo | null) => void;
  onClearCountrySelection: () => void;
  onCreateFavouriteList: (name: string) => Promise<FavouriteListDto | null>;
  onDeleteFavouriteList: (listId: string) => Promise<void>;
  onFavouritePointInspect: (point: TerraPoint) => void;
  onFavouritePointPlay: (point: TerraPoint) => void;
  onLoginOpen: () => void;
  onLogoutRequest: () => void;
  onLoadMoreRemotePoints?: () => void;
  onModeSelect: (modeId: TerraModeId) => void;
  onBack: () => void;
  onOpenFavouritePicker: (point: TerraPoint) => void;
  onPointInspect: (point: TerraPoint) => void;
  onPointPlay: (point: TerraPoint) => void;
  onQueryChange: (value: string) => void;
  onRemoveFavouriteFromList: (listId: string, point: TerraPoint) => Promise<void>;
  onRenameFavouriteList: (listId: string, name: string) => Promise<void>;
  onSetAccountView: (view: Extract<ShellDrawerView, "account-info" | "themes" | "contact">) => void;
  onSetMobilePosition: (position: DrawerMobilePosition) => void;
  onSortChange: (sortId: string) => void;
  onThemeChange: (themeId: TerraThemeId) => void;
  onToggleCollapsed: () => void;
};

export function SideDrawer({
  activeMode,
  activeModeId,
  activePlaybackPointKey,
  accountContactLinks,
  accountLoading,
  canGoBack,
  collapsed,
  detail,
  detailAccessory,
  favouritePointIds,
  favouriteLists,
  favouritesLoading,
  hasMoreRemotePoints,
  isLoadingDrawerTask,
  loading,
  loadingTaskLabel,
  loadingMoreRemotePoints,
  mobilePosition,
  modes,
  points,
  providerError,
  query,
  selectedCountry,
  selectedId,
  selectedThemeId,
  shellRef,
  sortId,
  totalPoints,
  totalPointsKind,
  user,
  view,
  onAccountUpdated,
  onCountryFilterChange,
  onClearCountrySelection,
  onCreateFavouriteList,
  onDeleteFavouriteList,
  onFavouritePointInspect,
  onFavouritePointPlay,
  onLoginOpen,
  onLogoutRequest,
  onLoadMoreRemotePoints,
  onModeSelect,
  onBack,
  onOpenFavouritePicker,
  onPointInspect,
  onPointPlay,
  onQueryChange,
  onRemoveFavouriteFromList,
  onRenameFavouriteList,
  onSetAccountView,
  onSetMobilePosition,
  onSortChange,
  onThemeChange,
  onToggleCollapsed
}: SideDrawerProps) {
  const isDetail = Boolean(selectedId) && view === "point-detail";
  const isAccountView = view === "account" || view === "account-info" || view === "themes" || view === "contact";
  return (
    <>
      <DrawerLoadingStatus active={isLoadingDrawerTask} label={loadingTaskLabel} />
      <aside
        className={`drawer ${collapsed ? "collapsed" : ""}`}
        aria-label={`${activeMode.label} data`}
        data-mobile-position={mobilePosition}
      >
        <button
          aria-label={collapsed ? "Open drawer" : "Close drawer"}
          className="drawer-toggle"
          type="button"
          onClick={onToggleCollapsed}
        >
          {collapsed ? <ChevronLeft size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
        </button>

        <MobileDrawerHandle
          mobilePosition={mobilePosition}
          shellRef={shellRef}
          onMobilePositionChange={onSetMobilePosition}
        />

        <div className="drawer-inner">
          {isDetail ? (
            <PointDetailDrawer
              activeMode={activeMode}
              detail={detail}
              detailAccessory={detailAccessory}
              onBack={onBack}
            />
          ) : view === "mode-switcher" ? (
            <ModeSwitcherDrawer
              activeModeId={activeModeId}
              canGoBack={canGoBack}
              modes={modes}
              onBack={onBack}
              onModeSelect={onModeSelect}
            />
          ) : view === "favourites" ? (
            <FavouritesDrawer
              activePlaybackPointKey={activePlaybackPointKey}
              canGoBack={canGoBack}
              lists={favouriteLists}
              loading={favouritesLoading}
              onBack={onBack}
              onCreateList={onCreateFavouriteList}
              onDeleteList={onDeleteFavouriteList}
              onFavouriteInspect={onFavouritePointInspect}
              onFavouritePlay={onFavouritePointPlay}
              onRemoveFavouriteFromList={onRemoveFavouriteFromList}
              onRenameList={onRenameFavouriteList}
            />
          ) : isAccountView ? (
            <AccountDrawer
              canGoBack={canGoBack}
              contactLinks={accountContactLinks}
              loading={accountLoading}
              selectedThemeId={selectedThemeId}
              user={user}
              view={view}
              onAccountUpdated={onAccountUpdated}
              onAuthOpen={onLoginOpen}
              onBack={onBack}
              onLogoutRequest={onLogoutRequest}
              onThemeChange={onThemeChange}
              onViewChange={onSetAccountView}
            />
          ) : (
            <SideDrawerList
              activeMode={activeMode}
              activePlaybackPointKey={activePlaybackPointKey}
              favouritePointIds={favouritePointIds}
              hasMoreRemotePoints={hasMoreRemotePoints}
              loading={loading}
              loadingMoreRemotePoints={loadingMoreRemotePoints}
              points={points}
              providerError={providerError}
              query={query}
              selectedCountry={selectedCountry}
              selectedId={selectedId}
              sortId={sortId}
              totalPoints={totalPoints}
              totalPointsKind={totalPointsKind}
              onCountryFilterChange={onCountryFilterChange}
              onClearCountrySelection={onClearCountrySelection}
              onLoadMoreRemotePoints={onLoadMoreRemotePoints}
              onPointInspect={onPointInspect}
              onPointPlay={onPointPlay}
              onQueryChange={onQueryChange}
              onSortChange={onSortChange}
              onToggleFavourite={onOpenFavouritePicker}
            />
          )}
        </div>
      </aside>
    </>
  );
}

function DrawerLoadingStatus({ active, label }: { active: boolean; label: string }) {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"loading" | "complete">("loading");

  useEffect(() => {
    if (active) {
      setVisible(true);
      setStatus("loading");
      return;
    }

    setStatus("complete");
    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [active]);

  if (!visible) {
    return null;
  }

  return (
    <div className={`drawer-loading-panel ${status}`} role="status" aria-live="polite">
      {status === "loading" ? (
        <LoaderCircle className="drawer-loading-icon spinning" size={18} aria-hidden="true" />
      ) : (
        <CheckCircle2 className="drawer-loading-icon" size={18} aria-hidden="true" />
      )}
      <span>{status === "loading" ? label : "Loaded"}</span>
    </div>
  );
}
