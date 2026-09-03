"use client";

import { ChevronLeft, LogOut, Mail, Palette, Shield } from "lucide-react";
import type { ReactNode } from "react";
import type { ContactLink } from "@/lib/app-config/types";
import type { TerraThemeId } from "@/lib/theme/themes";
import type { ViewerDto } from "@/lib/users/dto";
import { AccountPanel, ContactPanel } from "../account/AccountPanels";
import { ThemePicker } from "../account/ThemePicker";
import { DrawerHeader } from "../drawer/DrawerHeader";
import type { ShellDrawerView } from "./drawerState";

type AccountDrawerProps = {
  canGoBack: boolean;
  contactLinks: ContactLink[];
  loading: boolean;
  selectedThemeId: TerraThemeId;
  user: ViewerDto | null;
  view: Extract<ShellDrawerView, "account" | "account-info" | "themes" | "contact">;
  onAccountUpdated: () => void | Promise<void>;
  onAuthOpen: () => void;
  onBack: () => void;
  onLogoutRequest: () => void;
  onThemeChange: (themeId: TerraThemeId) => void;
  onViewChange: (view: Extract<ShellDrawerView, "account-info" | "themes" | "contact">) => void;
};

export function AccountDrawer({
  canGoBack,
  contactLinks,
  loading,
  onAccountUpdated,
  onAuthOpen,
  onBack,
  onLogoutRequest,
  onThemeChange,
  onViewChange,
  selectedThemeId,
  user,
  view
}: AccountDrawerProps) {
  if (view === "account-info") {
    return (
      <AccountDrawerPanel title="Account info" subtitle="Profile and account details" onBack={onBack}>
        <AccountPanel loading={loading} user={user} onAccountUpdated={onAccountUpdated} onAuthOpen={onAuthOpen} />
      </AccountDrawerPanel>
    );
  }

  if (view === "themes") {
    return (
      <AccountDrawerPanel title="Themes" subtitle="Choose your Blomoon appearance" onBack={onBack}>
        <ThemePicker selectedThemeId={selectedThemeId} onThemeChange={onThemeChange} />
      </AccountDrawerPanel>
    );
  }

  if (view === "contact") {
    return (
      <AccountDrawerPanel title="Contact us" subtitle="Ways to reach the Blomoon team" onBack={onBack}>
        <ContactPanel links={contactLinks} />
      </AccountDrawerPanel>
    );
  }

  return (
    <div className="account-drawer-view" aria-label="Account">
      <DrawerHeader
        title={user ? "Manage account" : "Account access"}
        subtitle={user ? user.email : "Log in or register to save lists across devices."}
        actions={canGoBack ? (
          <button className="icon-button" type="button" aria-label="Back to list" onClick={onBack}>
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
        ) : null}
      />
      <div className="account-drawer-actions">
        {!user && !loading ? (
          <button type="button" onClick={onAuthOpen}>
            <Shield size={16} aria-hidden="true" />
            <span>Log in or register</span>
          </button>
        ) : null}
        {user ? (
          <button type="button" onClick={() => onViewChange("account-info")}>
            <Shield size={16} aria-hidden="true" />
            <span>Account info</span>
          </button>
        ) : null}
        <button type="button" onClick={() => onViewChange("themes")}>
          <Palette size={16} aria-hidden="true" />
          <span>Themes</span>
        </button>
        {contactLinks.length > 0 ? (
          <button type="button" onClick={() => onViewChange("contact")}>
            <Mail size={16} aria-hidden="true" />
            <span>Contact us</span>
          </button>
        ) : null}
        {user ? (
          <button className="logout-action" type="button" onClick={onLogoutRequest}>
            <LogOut size={16} aria-hidden="true" />
            <span>Log out</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AccountDrawerPanel({
  children,
  onBack,
  subtitle,
  title
}: {
  children: ReactNode;
  onBack: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="account-drawer-view" aria-label={title}>
      <DrawerHeader
        title={title}
        subtitle={subtitle}
        actions={(
          <button className="icon-button" type="button" aria-label="Back to account" onClick={onBack}>
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
        )}
      />
      <div className="account-drawer-body">{children}</div>
    </div>
  );
}
