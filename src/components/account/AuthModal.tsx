"use client";

import { LoaderCircle, Mail, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";

type AuthMode = "login" | "register";
type FormNotice = {
  kind: "info" | "success";
  message: string;
};

type AuthModalProps = {
  googleAuthEnabled: boolean;
  open: boolean;
  onClose: () => void;
  onAuthenticated: () => void | Promise<void>;
};

export function AuthModal({ googleAuthEnabled, open, onAuthenticated, onClose }: AuthModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <AuthCard
        googleAuthEnabled={googleAuthEnabled}
        modeLabel="Blomoon account"
        onAuthenticated={onAuthenticated}
        onClose={onClose}
      />
    </div>
  );
}

export function AuthGate({
  googleAuthEnabled,
  serviceError,
  onAuthenticated
}: {
  googleAuthEnabled: boolean;
  serviceError: string | null;
  onAuthenticated: () => void | Promise<void>;
}) {
  return (
    <main className="auth-gate">
      <AuthCard
        googleAuthEnabled={googleAuthEnabled}
        modeLabel="Welcome to Blomoon"
        serviceError={serviceError}
        titleSuffix="Explore live streams by place after you sign in."
        onAuthenticated={onAuthenticated}
      />
    </main>
  );
}

function AuthCard({
  googleAuthEnabled,
  modeLabel,
  onAuthenticated,
  onClose,
  serviceError,
  titleSuffix
}: {
  googleAuthEnabled: boolean;
  modeLabel: string;
  onAuthenticated: () => void | Promise<void>;
  onClose?: () => void;
  serviceError?: string | null;
  titleSuffix?: string;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (mode === "login") {
        const result = await authClient.signIn.email({
          callbackURL: "/?auth=verified",
          email: normalizedEmail,
          password,
          rememberMe: true
        });

        if (result.error) {
          if (isEmailVerificationError(result.error)) {
            setVerificationEmail(normalizedEmail);
            setNotice({
              kind: "info",
              message: "Verify your email before logging in. We sent a new verification link."
            });
            return;
          }

          setError(result.error.message ?? "Authentication failed.");
          return;
        }

        await onAuthenticated();
        onClose?.();
        setPassword("");
        return;
      }

      const result = await authClient.signUp.email({
        callbackURL: "/?auth=verified",
        email: normalizedEmail,
        name: normalizedEmail,
        password
      });

      if (result.error) {
        setError(result.error.message ?? "Authentication failed.");
        return;
      }

      setVerificationEmail(normalizedEmail);
      setPassword("");
      setNotice({
        kind: "success",
        message: "Check your email for a verification link before logging in."
      });
    } catch {
      setError("Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerificationEmail() {
    const normalizedEmail = (verificationEmail ?? email).trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter your email address first.");
      return;
    }

    setResendingVerification(true);
    setError(null);
    setNotice(null);

    try {
      const result = await authClient.sendVerificationEmail({
        callbackURL: "/?auth=verified",
        email: normalizedEmail
      });

      if (result.error) {
        setError(result.error.message ?? "Could not send a verification email.");
        return;
      }

      setVerificationEmail(normalizedEmail);
      setNotice({
        kind: "success",
        message: "Verification link sent. Check your email."
      });
    } catch {
      setError("Could not send a verification email.");
    } finally {
      setResendingVerification(false);
    }
  }

  async function signInWithGoogle() {
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/"
      });

      if (result?.error) {
        setError(result.error.message ?? "Google sign-in failed.");
      }
    } catch {
      setError("Google sign-in is unavailable.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="modal-header">
        <div>
          <div className="drawer-kicker">{modeLabel}</div>
          <h2 id="auth-title">{mode === "login" ? "Log in" : "Create account"}</h2>
          {titleSuffix ? <p className="auth-greeting">{titleSuffix}</p> : null}
        </div>
        {onClose ? (
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
            <X size={17} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <form className="auth-form" onSubmit={submit}>
        <label className="form-field">
          <span>Email</span>
          <input
            autoComplete="email"
            required
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setVerificationEmail(null);
            }}
          />
        </label>
        <label className="form-field">
          <span>Password</span>
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {serviceError ? <div className="form-error">{serviceError}</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
        {notice ? <div className={`form-status ${notice.kind}`}>{notice.message}</div> : null}

        <button className="primary-action" disabled={submitting || Boolean(serviceError)} type="submit">
          {submitting ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : null}
          {mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      {verificationEmail ? (
        <button
          className="secondary-action"
          disabled={resendingVerification || submitting || Boolean(serviceError)}
          type="button"
          onClick={resendVerificationEmail}
        >
          {resendingVerification ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : null}
          {!resendingVerification ? <Mail size={15} aria-hidden="true" /> : null}
          Resend verification email
        </button>
      ) : null}

      {googleAuthEnabled ? (
        <button className="secondary-action" disabled={submitting || Boolean(serviceError)} type="button" onClick={signInWithGoogle}>
          Continue with Google
        </button>
      ) : null}

      <button
        className="text-action"
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
          setNotice(null);
          setVerificationEmail(null);
        }}
      >
        {mode === "login" ? "Create an account" : "Use an existing account"}
      </button>
    </div>
  );
}

function isEmailVerificationError(error: { code?: string; message?: string; status?: number }) {
  return error.status === 403
    || error.code === "EMAIL_NOT_VERIFIED"
    || error.message?.toLowerCase().includes("email not verified") === true;
}
