"use client";

import { KeyRound, LoaderCircle, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import type { ContactLink } from "@/lib/app-config/types";
import type { ViewerDto } from "@/lib/users/dto";

type AccountPanelProps = {
  loading: boolean;
  user: ViewerDto | null;
  onAccountUpdated: () => void | Promise<void>;
  onAuthOpen: () => void;
};

export function AccountPanel({ loading, onAccountUpdated, onAuthOpen, user }: AccountPanelProps) {
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
        <div>
          <strong>{user.emailVerified ? "Verified account" : "Email not verified"}</strong>
          <span>{user.email}</span>
        </div>
      </div>
      {!user.emailVerified ? <EmailVerificationPanel email={user.email} /> : null}

      <div className="account-section">
        <div className="account-section-heading">
          <strong>Login methods</strong>
          <span>Ways you can access this Blomoon account.</span>
        </div>
        <div className="account-methods">
          {user.authMethods.map((method) => (
            <div className="account-method" key={method.id}>
              <span>{method.label}</span>
              <strong>{method.enabled ? "Connected" : "Not connected"}</strong>
            </div>
          ))}
        </div>
      </div>

      <EmailChangeForm enabled={user.canChangeEmail} currentEmail={user.email} onAccountUpdated={onAccountUpdated} />
      <PasswordChangeForm enabled={user.authMethods.some((method) => method.id === "password" && method.enabled)} />
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

function EmailChangeForm({
  currentEmail,
  enabled,
  onAccountUpdated
}: {
  currentEmail: string;
  enabled: boolean;
  onAccountUpdated: () => void | Promise<void>;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enabled) {
      return;
    }

    const normalizedEmail = newEmail.trim().toLowerCase();
    setSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      const result = await authClient.emailOtp.requestEmailChange({
        newEmail: normalizedEmail
      });

      if (result.error) {
        setError(result.error.message ?? "Could not send a verification code.");
        return;
      }

      setNewEmail(normalizedEmail);
      setCodeRequested(true);
      setStatus("Verification code sent to the new email address.");
    } catch {
      setError("Could not send a verification code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enabled) {
      return;
    }

    setSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      const result = await authClient.emailOtp.changeEmail({
        newEmail: newEmail.trim().toLowerCase(),
        otp: otp.trim()
      });

      if (result.error) {
        setError(result.error.message ?? "Email change failed.");
        return;
      }

      setNewEmail("");
      setOtp("");
      setCodeRequested(false);
      setStatus("Email updated.");
      await onAccountUpdated();
    } catch {
      setError("Email change failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="account-section">
      <div className="account-section-heading">
        <strong>Change email</strong>
        <span>We send a one-time code to the new address before updating your account.</span>
      </div>
      <form className="account-form" onSubmit={codeRequested ? confirmChange : requestCode}>
        <label className="form-field">
          <span>Current email</span>
          <input disabled type="email" value={currentEmail} />
        </label>
        <label className="form-field">
          <span>New email</span>
          <input
            autoComplete="email"
            disabled={!enabled || submitting || codeRequested}
            required={enabled}
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
          />
        </label>
        {codeRequested ? (
          <label className="form-field">
            <span>Verification code</span>
            <input
              autoComplete="one-time-code"
              disabled={!enabled || submitting}
              inputMode="numeric"
              maxLength={8}
              required={enabled}
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
            />
          </label>
        ) : null}
        <div className="account-form-actions">
          <button className="secondary-action" disabled={!enabled || submitting} type="submit">
            {submitting ? <LoaderCircle className="spin" size={14} aria-hidden="true" /> : null}
            {codeRequested ? "Confirm email" : "Send code"}
          </button>
          {codeRequested ? (
            <button
              className="text-action"
              disabled={submitting}
              type="button"
              onClick={() => {
                setCodeRequested(false);
                setOtp("");
                setStatus(null);
                setError(null);
              }}
            >
              Use a different email
            </button>
          ) : null}
        </div>
        {status ? <div className="form-status success">{status}</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
      </form>
    </div>
  );
}

function PasswordChangeForm({ enabled }: { enabled: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!enabled) {
    return (
      <div className="account-section">
        <div className="account-section-heading">
          <strong>Password</strong>
          <span>This account currently uses Google sign-in. Password changes apply to accounts with password login connected.</span>
        </div>
        <div className="account-info-row">
          <KeyRound size={16} aria-hidden="true" />
          <span>Use Google to sign in to this account.</span>
        </div>
      </div>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
    <div className="account-section">
      <div className="account-section-heading">
        <strong>Password</strong>
        <span>Changing your password signs out other active sessions.</span>
      </div>
      <form className="account-form" onSubmit={submit}>
        <label className="form-field">
          <span>Current password</span>
          <input
            autoComplete="current-password"
            required
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label className="form-field">
          <span>New password</span>
          <input
            autoComplete="new-password"
            minLength={8}
            required
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        <button className="secondary-action" disabled={submitting} type="submit">
          {submitting ? <LoaderCircle className="spin" size={14} aria-hidden="true" /> : null}
          Change password
        </button>
        {status ? <div className="form-status success">{status}</div> : null}
      </form>
    </div>
  );
}

export function ContactPanel({ links }: { links: ContactLink[] }) {
  return (
    <div className="contact-panel">
      <div className="contact-copy">
        <strong>Help shape Blomoon while it is in beta.</strong>
        <span>Report bugs, broken flows, confusing UI, missing details, or feature ideas. Short reports are welcome.</span>
      </div>
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
