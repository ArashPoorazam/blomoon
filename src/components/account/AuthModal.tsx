"use client";

import { LoaderCircle, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";

type AuthMode = "login" | "register";

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
        modeLabel="Terravue account"
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
        modeLabel="Welcome to Terravue"
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
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = mode === "login"
        ? await authClient.signIn.email({ email: normalizedEmail, password, rememberMe: true })
        : await authClient.signUp.email({ email: normalizedEmail, name: normalizedEmail, password });

      if (result.error) {
        setError(result.error.message ?? "Authentication failed.");
        return;
      }

      await onAuthenticated();
      onClose?.();
      setPassword("");
    } catch {
      setError("Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function signInWithGoogle() {
    setSubmitting(true);
    setError(null);

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
            onChange={(event) => setEmail(event.target.value)}
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

        <button className="primary-action" disabled={submitting || Boolean(serviceError)} type="submit">
          {submitting ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : null}
          {mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

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
        }}
      >
        {mode === "login" ? "Create an account" : "Use an existing account"}
      </button>
    </div>
  );
}
