"use client";

import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { ContactLink } from "@/lib/app-config/types";
import type { CountryInfo } from "@/lib/geo";
import type { TerraMode, TerraModeId, TerraPoint, TerraPointDetail } from "@/lib/modes/types";
import type { FavouriteListDto } from "@/lib/persistence/types";
import type { TerraThemeId } from "@/lib/theme/themes";
import type { ViewerDto } from "@/lib/users/dto";
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
  sortId: string;
  totalPoints: number;
  totalPointsKind: "exact" | "lowerBound";
  user: ViewerDto | null;
  view: ShellDrawerView;
  onAccountUpdated: () => void | Promise<void>;
  onCountryFilterChange: (country: CountryInfo | null) => void;
  onClearCountrySelection: () => void;
  onClearSelection: () => void;
  onCreateFavouriteList: (name: string) => Promise<FavouriteListDto | null>;
  onDeleteFavouriteList: (listId: string) => Promise<void>;
  onFavouriteSelect: (modeId: TerraModeId, point: TerraPoint) => void;
  onLoginOpen: () => void;
  onLogoutRequest: () => void;
  onLoadMoreRemotePoints?: () => void;
  onModeSelect: (modeId: TerraModeId) => void;
  onOpenAccountRoot: () => void;
  onOpenFavouritePicker: (point: TerraPoint) => void;
  onPointSelect: (point: TerraPoint) => void;
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
  sortId,
  totalPoints,
  totalPointsKind,
  user,
  view,
  onAccountUpdated,
  onCountryFilterChange,
  onClearCountrySelection,
  onClearSelection,
  onCreateFavouriteList,
  onDeleteFavouriteList,
  onFavouriteSelect,
  onLoginOpen,
  onLogoutRequest,
  onLoadMoreRemotePoints,
  onModeSelect,
  onOpenAccountRoot,
  onOpenFavouritePicker,
  onPointSelect,
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
    <aside
      className={`drawer ${collapsed ? "collapsed" : ""}`}
      aria-label={`${activeMode.label} data`}
      data-mobile-position={mobilePosition}
    >
      <DrawerLoadingStatus active={isLoadingDrawerTask} label={loadingTaskLabel} />

      <button
        aria-label={collapsed ? "Open drawer" : "Close drawer"}
        className="drawer-toggle"
        type="button"
        onClick={onToggleCollapsed}
      >
        {collapsed ? <ChevronLeft size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
      </button>

      {mobilePosition === "standard" ? (
        <div className="drawer-sheet-handle" aria-label="Drawer height controls">
          <button aria-label="Close drawer" type="button" onClick={() => onSetMobilePosition("closed")}>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          <span aria-hidden="true" />
          <button aria-label="Open drawer fully" type="button" onClick={() => onSetMobilePosition("full")}>
            <ChevronDown className="chevron-up" size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className="drawer-inner">
        {isDetail ? (
          <DetailView
            activeMode={activeMode}
            detail={detail}
            detailAccessory={detailAccessory}
            onClearSelection={onClearSelection}
          />
        ) : view === "mode-switcher" ? (
          <ModeSwitcherDrawer activeModeId={activeModeId} modes={modes} onModeSelect={onModeSelect} />
        ) : view === "favourites" ? (
          <FavouritesDrawer
            activePlaybackPointKey={activePlaybackPointKey}
            lists={favouriteLists}
            loading={favouritesLoading}
            onCreateList={onCreateFavouriteList}
            onDeleteList={onDeleteFavouriteList}
            onFavouriteSelect={onFavouriteSelect}
            onRemoveFavouriteFromList={onRemoveFavouriteFromList}
            onRenameList={onRenameFavouriteList}
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
            onBack={onOpenAccountRoot}
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
            onPointSelect={onPointSelect}
            onQueryChange={onQueryChange}
            onSortChange={onSortChange}
            onToggleFavourite={onOpenFavouritePicker}
          />
        )}
      </div>
    </aside>
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

function DetailView({
  activeMode,
  detail,
  detailAccessory,
  onClearSelection
}: {
  activeMode: TerraMode;
  detail: TerraPointDetail | null;
  detailAccessory?: React.ReactNode;
  onClearSelection: () => void;
}) {
  return (
    <>
      <div className="drawer-header">
        <div>
          <div className="drawer-kicker">Blomoon · {activeMode.label}</div>
          <h1 className="drawer-title">{detail?.name ?? "Loading"}</h1>
          <p className="drawer-subtitle">{detail?.summary ?? ""}</p>
        </div>
        <button className="icon-button" type="button" aria-label="Back to list" onClick={onClearSelection}>
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      <div className="detail-body">
        {detailAccessory ? <div className="detail-accessory">{detailAccessory}</div> : null}

        <div className="detail-sections">
          {activeMode.formatDetailSections(detail).map((section) => (
            <div className="detail-section" key={section.title}>
              <div className="detail-section-title">{section.title}</div>
              <div className="detail-grid">
                {section.fields.map((field) => (
                  <div className="detail-stat" key={field.label}>
                    <div className="detail-label">{field.label}</div>
                    <div className="detail-value">{field.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {detail?.sourceUrl ? (
          <a className="detail-link" href={detail.sourceUrl} target="_blank" rel="noreferrer">
            Source record
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </>
  );
}
