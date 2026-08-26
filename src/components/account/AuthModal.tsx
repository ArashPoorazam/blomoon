"use client";

import { LoaderCircle, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";

type AuthMode = "login" | "register";

type AuthModalProps = {
  googleAuthEnabled: boolean;
  open: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
};

export function AuthModal({ googleAuthEnabled, open, onAuthenticated, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const displayName = name.trim() || normalizedEmail;
      const result = mode === "login"
        ? await authClient.signIn.email({ email: normalizedEmail, password, rememberMe: true })
        : await authClient.signUp.email({ email: normalizedEmail, name: displayName, password });

      if (result.error) {
        setError(result.error.message ?? "Authentication failed.");
        return;
      }

      await onAuthenticated();
      onClose();
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
    <div className="modal-backdrop" role="presentation">
      <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="modal-header">
          <div>
            <div className="drawer-kicker">Terravue account</div>
            <h2 id="auth-title">{mode === "login" ? "Log in" : "Create account"}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" ? (
            <label className="form-field">
              <span>Name</span>
              <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
          ) : null}
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

          {error ? <div className="form-error">{error}</div> : null}

          <button className="primary-action" disabled={submitting} type="submit">
            {submitting ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : null}
            {mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        {googleAuthEnabled ? (
          <button className="secondary-action" disabled={submitting} type="button" onClick={signInWithGoogle}>
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
    </div>
  );
}
