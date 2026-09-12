"use client";

import { memo, type ReactNode } from "react";
import type { ContactLink } from "@/lib/app-config/types";
import type { CountryInfo } from "@/lib/geo";
import type { TerraMode, TerraModeId, TerraPoint, TerraPointDetail } from "@/lib/modes/types";
import type { FavouriteFolderDto, FavouriteFolderSummaryDto } from "@/lib/persistence/types";
import type { PlaybackHistoryModeState } from "./history/usePlaybackHistory";
import type { TerraThemeId } from "@/lib/theme/themes";
import type { ViewerDto } from "@/lib/users/dto";
import { PointDetailDrawer } from "./drawer/PointDetailDrawer";
import { FavouriteFolderDetail } from "./favourites/FavouriteFolderDetail";
import { FavouriteFolderIndex } from "./favourites/FavouriteFolderIndex";
import { PlaybackHistoryDrawer } from "./history/PlaybackHistoryDrawer";
import { AccountDrawer } from "./shell/AccountDrawer";
import type { ShellDrawerEntry, ShellDrawerView } from "./shell/drawerState";
import { ModeSwitcherDrawer } from "./shell/ModeSwitcherDrawer";
import { SideDrawerList } from "./SideDrawerList";

export type DrawerContentProps = {
  activeMode: TerraMode;
  activeModeId: TerraModeId;
  activePlaybackPointKey: string | null;
  accountContactLinks: ContactLink[];
  accountLoading: boolean;
  detail: TerraPointDetail | null;
  detailAccessory?: ReactNode;
  favouritePointIds: Set<string>;
  activeFavouriteFolder: FavouriteFolderDto | null;
  favouriteFolders: FavouriteFolderSummaryDto[];
  favouritesLoading: boolean;
  favouriteFolderLoading: boolean;
  hasMoreRemotePoints?: boolean;
  history: PlaybackHistoryModeState;
  loading: boolean;
  loadingMoreRemotePoints?: boolean;
  modes: TerraMode[];
  points: TerraPoint[];
  providerError: string | null;
  query: string;
  selectedCountry: CountryInfo | null;
  selectedId: string | null;
  selectedThemeId: TerraThemeId;
  sortId: string;
  suggestionTitle?: string;
  catalogTotal?: number;
  totalPoints: number;
  totalPointsKind: "exact" | "lowerBound";
  user: ViewerDto | null;
  view: ShellDrawerView;
  entry: ShellDrawerEntry;
  onAccountUpdated: () => void | Promise<void>;
  onCountryFilterChange: (country: CountryInfo | null) => void;
  onClearCountrySelection: () => void;
  onCreateFavouriteFolder: (name: string, description: string | null, modeId: string) => Promise<FavouriteFolderSummaryDto | null>;
  onDeleteFavouriteFolder: (folderId: string) => Promise<boolean>;
  onOpenFavouriteFolder: (folderId: string) => void;
  onFavouritePointInspect: (point: TerraPoint) => void;
  onFavouritePointPlay: (point: TerraPoint) => void;
  onHistoryPointPlay: (point: TerraPoint) => void;
  onHistoryRetry: () => void;
  onLoginOpen: () => void;
  onLogoutRequest: () => void;
  onLoadMoreRemotePoints?: () => void;
  onModeSelect: (modeId: TerraModeId) => void;
  onBack: () => void;
  onOpenFavouritePicker: (point: TerraPoint) => void;
  onPointInspect: (point: TerraPoint) => void;
  onPointPlay: (point: TerraPoint) => void;
  onPointShare: (point: TerraPoint) => void;
  onQueryChange: (value: string) => void;
  onRemoveFavouriteFromFolder: (folderId: string, point: TerraPoint) => Promise<void>;
  onShareFavouriteFolder: (folderId: string, rotate?: boolean) => Promise<string | null>;
  onUpdateFavouriteFolder: (folderId: string, name: string, description: string | null) => Promise<boolean>;
  onSetAccountView: (view: Extract<ShellDrawerView, "account-info" | "themes" | "contact">) => void;
  onSortChange: (sortId: string) => void;
  onThemeChange: (themeId: TerraThemeId) => void;
};

export const DrawerContent = memo(function DrawerContent({
  activeMode,
  activeModeId,
  activePlaybackPointKey,
  activeFavouriteFolder,
  accountContactLinks,
  accountLoading,
  detail,
  detailAccessory,
  favouritePointIds,
  favouriteFolders,
  favouriteFolderLoading,
  favouritesLoading,
  hasMoreRemotePoints,
  history,
  loading,
  loadingMoreRemotePoints,
  modes,
  points,
  providerError,
  query,
  selectedCountry,
  selectedId,
  selectedThemeId,
  sortId,
  suggestionTitle,
  catalogTotal,
  totalPoints,
  totalPointsKind,
  user,
  view,
  entry,
  onAccountUpdated,
  onCountryFilterChange,
  onClearCountrySelection,
  onCreateFavouriteFolder,
  onDeleteFavouriteFolder,
  onOpenFavouriteFolder,
  onFavouritePointInspect,
  onFavouritePointPlay,
  onHistoryPointPlay,
  onHistoryRetry,
  onLoginOpen,
  onLogoutRequest,
  onLoadMoreRemotePoints,
  onModeSelect,
  onBack,
  onOpenFavouritePicker,
  onPointInspect,
  onPointPlay,
  onPointShare,
  onQueryChange,
  onRemoveFavouriteFromFolder,
  onShareFavouriteFolder,
  onUpdateFavouriteFolder,
  onSetAccountView,
  onSortChange,
  onThemeChange,
}: DrawerContentProps) {
  const isDetail = view === "point-detail";
  const isAccountView = view === "account" || view === "account-info" || view === "themes" || view === "contact";
  return <>
    {isDetail ? (
      <PointDetailDrawer
        activeMode={activeMode}
        detail={detail}
        detailAccessory={detailAccessory}
        onBack={onBack}
        onShare={onPointShare}
      />
    ) : view === "mode-switcher" ? (
      <ModeSwitcherDrawer
        activeModeId={activeModeId}
        modes={modes}
        onModeSelect={onModeSelect}
      />
    ) : view === "favourites" ? (
      <FavouriteFolderIndex
        modeId={activeModeId}
        folders={favouriteFolders}
        loading={favouritesLoading}
        onCreate={onCreateFavouriteFolder}
        onOpen={onOpenFavouriteFolder}
      />
    ) : view === "history" ? (
      <PlaybackHistoryDrawer
        activeMode={activeMode}
        activePlaybackPointKey={activePlaybackPointKey}
        favouritePointIds={favouritePointIds}
        history={history}
        selectedId={selectedId}
        onInspect={onPointInspect}
        onPlay={onHistoryPointPlay}
        onRetry={onHistoryRetry}
        onShare={onPointShare}
        onToggleFavourite={onOpenFavouritePicker}
      />
    ) : view === "favourite-folder" && entry.kind === "favourite-folder" ? (
      <FavouriteFolderDetail
        activePlaybackPointKey={activePlaybackPointKey}
        folder={activeFavouriteFolder?.id === entry.folderId ? activeFavouriteFolder : null}
        loading={favouriteFolderLoading}
        onBack={onBack}
        onDelete={onDeleteFavouriteFolder}
        onInspect={onFavouritePointInspect}
        onPlay={onFavouritePointPlay}
        onRemove={onRemoveFavouriteFromFolder}
        onShare={onShareFavouriteFolder}
        onSharePoint={onPointShare}
        onUpdate={onUpdateFavouriteFolder}
      />
    ) : isAccountView ? (
      <AccountDrawer
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
        suggestionTitle={suggestionTitle}
        catalogTotal={catalogTotal}
        totalPoints={totalPoints}
        totalPointsKind={totalPointsKind}
        onCountryFilterChange={onCountryFilterChange}
        onClearCountrySelection={onClearCountrySelection}
        onLoadMoreRemotePoints={onLoadMoreRemotePoints}
        onPointInspect={onPointInspect}
        onPointPlay={onPointPlay}
        onPointShare={onPointShare}
        onQueryChange={onQueryChange}
        onSortChange={onSortChange}
        onToggleFavourite={onOpenFavouritePicker}
      />
    )}
  </>;
});
