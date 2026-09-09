"use client";

import { AuthModal } from "./AuthModal";
import { MobileLogoutConfirm } from "./MobileLogoutConfirm";

export function ShellAccountOverlays({ authOpen, googleAuthEnabled, logoutOpen, serviceError, onAuthenticated, onAuthClose, onLogoutClose, onLogoutConfirm }: {
  authOpen: boolean; googleAuthEnabled: boolean; logoutOpen: boolean; serviceError: string | null;
  onAuthenticated: () => void | Promise<void>; onAuthClose: () => void; onLogoutClose: () => void; onLogoutConfirm: () => void | Promise<void>;
}) {
  return <>
    {logoutOpen ? <MobileLogoutConfirm onClose={onLogoutClose} onConfirm={onLogoutConfirm} /> : null}
    <AuthModal googleAuthEnabled={googleAuthEnabled} open={authOpen} serviceError={serviceError} onClose={onAuthClose} onAuthenticated={onAuthenticated} />
  </>;
}
