"use client";

import { AuthCard } from "./AuthCard";

type AuthModalProps = {
  googleAuthEnabled: boolean;
  open: boolean;
  serviceError?: string | null;
  onClose: () => void;
  onAuthenticated: () => void | Promise<void>;
};

export function AuthModal({ googleAuthEnabled, open, serviceError, onAuthenticated, onClose }: AuthModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <AuthCard
        googleAuthEnabled={googleAuthEnabled}
        modeLabel="Blomoon account"
        serviceError={serviceError}
        onAuthenticated={onAuthenticated}
        onClose={onClose}
      />
    </div>
  );
}
