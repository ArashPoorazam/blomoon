"use client";

import { LoaderCircle, LogOut, Mail, Palette, Shield, UserCircle } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { authClient } from "@/lib/auth/client";
import type { ContactLink } from "@/lib/app-config/types";
import type { TerraThemeId } from "@/lib/theme/themes";
import type { ViewerDto } from "@/lib/users/dto";
import { ThemePicker } from "./ThemePicker";

type AccountMenuProps = {
  contactLinks: ContactLink[];
  loading: boolean;
  selectedThemeId: TerraThemeId;
  user: ViewerDto | null;
  onAuthOpen: () => void;
  onLogout: () => void;
  onThemeChange: (themeId: TerraThemeId) => void;
};

type MenuView = "account" | "themes" | "contact";
type MenuAction = {
  icon: ReactNode;
  id: MenuView | "auth" | "logout";
  label: string;
};

export function AccountMenu({
  contactLinks,
  loading,
  onAuthOpen,
  onLogout,
  onThemeChange,
  selectedThemeId,
  user
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<MenuView | null>(null);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const activeView = view === "contact" && contactLinks.length === 0 ? null : view;
  const actions = getMenuActions({ contactLinks, loading, user });

  return (
    <div className="account-menu">
      <button
        aria-expanded={open}
        aria-label="Account menu"
        className="account-menu-trigger"
        type="button"
        onClick={() => {
          setOpen((value) => {
            if (!value) {
              setView(null);
            }

            return !value;
          });
        }}
      >
        <UserCircle size={19} aria-hidden="true" />
      </button>

      {open ? (
        <div className="account-popover">
          <div className="account-action-list" aria-label="Account options">
            {actions.map((action) => (
              <button
                className={`${activeView === action.id ? "active" : ""} ${action.id === "logout" ? "logout-action" : ""}`}
                key={action.id}
                type="button"
                onClick={() => {
                  if (action.id === "auth") {
                    onAuthOpen();
                    setOpen(false);
                    return;
                  }

                  if (action.id === "logout") {
                    setConfirmingLogout(true);
                    return;
                  }

                  setView(action.id);
                }}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>

          {activeView === "account" ? (
            <AccountPanel loading={loading} user={user} onAuthOpen={onAuthOpen} />
          ) : null}
          {activeView === "themes" ? (
            <ThemePicker selectedThemeId={selectedThemeId} onThemeChange={onThemeChange} />
          ) : null}
          {activeView === "contact" ? <ContactPanel links={contactLinks} /> : null}
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
        <div className="account-avatar" aria-hidden="true">
          {user.email.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <strong>{user.emailVerified ? "Verified account" : "Email not verified"}</strong>
          <span>{user.email}</span>
        </div>
      </div>
      {!user.emailVerified ? <EmailVerificationPanel email={user.email} /> : null}
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

function EmailVerificationPanel({ email }: { email: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function resendVerificationEmail() {
    setSubmitting(true);
    setStatus(null);

    try {
      const result = await authClient.sendVerificationEmail({
        callbackURL: "/?auth=verified",
        email
      });

      if (result.error) {
        setStatus(result.error.message ?? "Could not send a verification email.");
        return;
      }

      setStatus("Verification link sent. Check your email.");
    } catch {
      setStatus("Could not send a verification email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="account-verification">
      <div>
        <strong>Email verification required</strong>
        <span>Verify this address to keep password access enabled.</span>
      </div>
      <button className="secondary-action" disabled={submitting} type="button" onClick={resendVerificationEmail}>
        {submitting ? <LoaderCircle className="spin" size={14} aria-hidden="true" /> : null}
        {!submitting ? <Mail size={14} aria-hidden="true" /> : null}
        Resend verification email
      </button>
      {status ? <div className="form-status">{status}</div> : null}
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

function ContactPanel({ links }: { links: ContactLink[] }) {
  return (
    <div className="contact-panel">
      {links.map((link) => (
        <a href={link.href} key={link.id} target={link.href.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer">
          <Mail size={14} aria-hidden="true" />
          <span>{link.label}</span>
          <strong>{link.value}</strong>
        </a>
      ))}
    </div>
  );
}
