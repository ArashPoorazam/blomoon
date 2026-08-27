"use client";

import { LogOut, Mail, Palette, Shield, UserCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth/client";
import type { ContactLink } from "@/lib/app-config/types";
import type { TerraThemeId } from "@/lib/theme/themes";
import type { ViewerDto } from "@/lib/users/dto";
import { AccountModalShell } from "./AccountModalShell";
import { AccountPanel, ContactPanel } from "./AccountPanels";
import { ThemePicker } from "./ThemePicker";

type AccountMenuProps = {
  contactLinks: ContactLink[];
  loading: boolean;
  selectedThemeId: TerraThemeId;
  user: ViewerDto | null;
  onAccountUpdated: () => void | Promise<void>;
  onAuthOpen: () => void;
  onLogout: () => void;
  onThemeChange: (themeId: TerraThemeId) => void;
};

type MenuView = "account" | "themes" | "contact";
type ModalView = MenuView | "logout";
type MenuAction = {
  icon: ReactNode;
  id: ModalView | "auth";
  label: string;
};

export function AccountMenu({
  contactLinks,
  loading,
  onAccountUpdated,
  onAuthOpen,
  onLogout,
  onThemeChange,
  selectedThemeId,
  user
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [modalView, setModalView] = useState<ModalView | null>(null);
  const actions = getMenuActions({ contactLinks, loading, user });

  function closeModal() {
    setModalView(null);
  }

  return (
    <div className="account-menu">
      <button
        aria-expanded={open}
        aria-label="Account menu"
        className="account-menu-trigger"
        type="button"
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        <UserCircle size={19} aria-hidden="true" />
      </button>

      {open ? (
        <div className="account-popover">
          <div className="account-action-list" aria-label="Account options">
            {actions.map((action) => (
              <button
                className={action.id === "logout" ? "logout-action" : ""}
                key={action.id}
                type="button"
                onClick={() => {
                  if (action.id === "auth") {
                    onAuthOpen();
                    setOpen(false);
                    return;
                  }

                  setModalView(action.id);
                  setOpen(false);
                }}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {modalView === "account" ? (
        <AccountModalShell
          description="Manage your sign-in details and account security without leaving the globe."
          kicker="Account"
          title="Account info"
          onClose={closeModal}
        >
          <AccountPanel loading={loading} user={user} onAccountUpdated={onAccountUpdated} onAuthOpen={onAuthOpen} />
        </AccountModalShell>
      ) : null}

      {modalView === "themes" ? (
        <AccountModalShell
          description="Choose how Blomoon colors the globe, markers, controls, and panels."
          kicker="Appearance"
          title="Themes"
          wide
          onClose={closeModal}
        >
          <ThemePicker selectedThemeId={selectedThemeId} onThemeChange={onThemeChange} />
        </AccountModalShell>
      ) : null}

      {modalView === "contact" ? (
        <AccountModalShell
          description="Blomoon is still in beta. Bug reports, rough edges, and feature ideas are genuinely useful while the app is evolving."
          kicker="Beta feedback"
          title="Contact us"
          onClose={closeModal}
        >
          <ContactPanel links={contactLinks} />
        </AccountModalShell>
      ) : null}

      {modalView === "logout" ? (
        <AccountModalShell
          description="This clears your active session on this device. Your saved stations and theme preference stay on your account."
          kicker="Session"
          title="Log out?"
          onClose={closeModal}
        >
          <div className="confirm-actions">
            <button
              className="primary-action danger-action"
              type="button"
              onClick={async () => {
                await authClient.signOut();
                closeModal();
                onLogout();
              }}
            >
              Log out
            </button>
            <button className="secondary-action" type="button" onClick={closeModal}>
              Not now
            </button>
          </div>
        </AccountModalShell>
      ) : null}
    </div>
  );
}

function getMenuActions({
  contactLinks,
  loading,
  user
}: {
  contactLinks: ContactLink[];
  loading: boolean;
  user: ViewerDto | null;
}): MenuAction[] {
  if (!user && !loading) {
    return [
      { icon: <Shield size={15} aria-hidden="true" />, id: "auth", label: "Log in or register" },
      { icon: <Palette size={15} aria-hidden="true" />, id: "themes", label: "Themes" },
      ...(contactLinks.length > 0
        ? [{ icon: <Mail size={15} aria-hidden="true" />, id: "contact" as const, label: "Contact us" }]
        : [])
    ];
  }

  return [
    { icon: <Shield size={15} aria-hidden="true" />, id: "account", label: "Account info" },
    { icon: <Palette size={15} aria-hidden="true" />, id: "themes", label: "Themes" },
    ...(contactLinks.length > 0
      ? [{ icon: <Mail size={15} aria-hidden="true" />, id: "contact" as const, label: "Contact us" }]
      : []),
    ...(user ? [{ icon: <LogOut size={15} aria-hidden="true" />, id: "logout" as const, label: "Log out" }] : [])
  ];
}
