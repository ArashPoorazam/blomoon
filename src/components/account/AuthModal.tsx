"use client";

import Image from "next/image";
import loginBackground from "@/assets/images/backgrounds/blomoon_login_background.webp";
import { AuthCard } from "./AuthCard";

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
      <Image
        alt=""
        aria-hidden="true"
        className="auth-background-image"
        fill
        priority
        sizes="100vw"
        src={loginBackground}
      />
      <div className="auth-background-vignette" aria-hidden="true" />
      <section className="auth-gate-layout" aria-label="Blomoon authentication">
        <div className="auth-brand">
          <div className="drawer-kicker">Live entertainment directory</div>
          <h1>Blomoon</h1>
          <p>Find live radio on globe, save your favorites, and experience the world by sound.</p>
        </div>
        <AuthCard
          googleAuthEnabled={googleAuthEnabled}
          modeLabel="Account access"
          serviceError={serviceError}
          titleSuffix="Sign in to keep your stations, themes, and listening history close."
          onAuthenticated={onAuthenticated}
        />
      </section>
    </main>
  );
}
