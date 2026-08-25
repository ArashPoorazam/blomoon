"use client";

import { LoaderCircle, LogOut, Palette, Shield, UserCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import type { TerraThemeId } from "@/lib/theme/themes";
import type { ViewerDto } from "@/lib/users/dto";
import { ThemePicker } from "./ThemePicker";

type AccountMenuProps = {
  loading: boolean;
  selectedThemeId: TerraThemeId;
  user: ViewerDto | null;
  onAuthOpen: () => void;
  onLogout: () => void;
  onThemeChange: (themeId: TerraThemeId) => void;
};

type MenuView = "account" | "themes" | "contact";

export function AccountMenu({
  loading,
  onAuthOpen,
  onLogout,
  onThemeChange,
  selectedThemeId,
  user
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<MenuView>("account");
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  return (
    <div className="account-menu">
      <button
        aria-expanded={open}
        aria-label="Account menu"
        className="account-menu-trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <UserCircle size={19} aria-hidden="true" />
      </button>

      {open ? (
        <div className="account-popover">
          <div className="account-tabs" role="tablist" aria-label="Account sections">
            <button className={view === "account" ? "active" : ""} type="button" onClick={() => setView("account")}>
              <Shield size={14} aria-hidden="true" />
              Account
            </button>
            <button className={view === "themes" ? "active" : ""} type="button" onClick={() => setView("themes")}>
              <Palette size={14} aria-hidden="true" />
              Themes
            </button>
            <button className={view === "contact" ? "active" : ""} type="button" onClick={() => setView("contact")}>
              Contact us
            </button>
          </div>

          {view === "account" ? (
            <AccountPanel loading={loading} user={user} onAuthOpen={onAuthOpen} />
          ) : null}
          {view === "themes" ? (
            <ThemePicker selectedThemeId={selectedThemeId} onThemeChange={onThemeChange} />
          ) : null}
          {view === "contact" ? <ContactPanel /> : null}

          {user ? (
            <button className="logout-action" type="button" onClick={() => setConfirmingLogout(true)}>
              <LogOut size={14} aria-hidden="true" />
              Log out
            </button>
          ) : null}
        </div>
      ) : null}

      {confirmingLogout ? (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title">
            <h2 id="logout-title">Log out?</h2>
            <div className="confirm-actions">
              <button
                className="primary-action"
                type="button"
                onClick={async () => {
                  await authClient.signOut();
                  setConfirmingLogout(false);
                  setOpen(false);
                  onLogout();
                }}
              >
                Log out
              </button>
              <button className="secondary-action" type="button" onClick={() => setConfirmingLogout(false)}>
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AccountPanel({
  loading,
  onAuthOpen,
  user
}: {
  loading: boolean;
  user: ViewerDto | null;
  onAuthOpen: () => void;
}) {
  if (loading) {
    return (
      <div className="account-panel">
        <LoaderCircle className="spin" size={16} aria-hidden="true" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="account-panel">
        <button className="primary-action" type="button" onClick={onAuthOpen}>
          Log in or register
        </button>
      </div>
    );
  }

  return (
    <div className="account-panel">
      <div className="account-identity">
        <strong>{user.name}</strong>
        <span>{user.email}</span>
      </div>
      <div className="account-methods">
        {user.authMethods.map((method) => (
          <div className="account-method" key={method.id}>
            <span>{method.label}</span>
            <strong>{method.enabled ? "Enabled" : "Not connected"}</strong>
          </div>
        ))}
      </div>
      <PasswordChangeForm enabled={user.authMethods.some((method) => method.id === "password" && method.enabled)} />
      <div className="account-note">Email changes require verified transactional email before they can be enabled.</div>
    </div>
  );
}

function PasswordChangeForm({ enabled }: { enabled: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enabled) {
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true
      });

      if (result.error) {
        setStatus(result.error.message ?? "Password change failed.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setStatus("Password updated.");
    } catch {
      setStatus("Password change failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="password-form" onSubmit={submit}>
      <label className="form-field">
        <span>Current password</span>
        <input
          autoComplete="current-password"
          disabled={!enabled}
          required={enabled}
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </label>
      <label className="form-field">
        <span>New password</span>
        <input
          autoComplete="new-password"
          disabled={!enabled}
          minLength={8}
          required={enabled}
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </label>
      <button className="secondary-action" disabled={!enabled || submitting} type="submit">
        {submitting ? <LoaderCircle className="spin" size={14} aria-hidden="true" /> : null}
        Change password
      </button>
      {status ? <div className="form-status">{status}</div> : null}
    </form>
  );
}

function ContactPanel() {
  return (
    <div className="contact-panel">
      <div><span>GitHub</span><strong /></div>
      <div><span>Telegram</span><strong /></div>
      <div><span>Email</span><strong /></div>
    </div>
  );
}
