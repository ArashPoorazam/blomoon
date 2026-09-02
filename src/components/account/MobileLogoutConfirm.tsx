"use client";

import { AccountModalShell } from "./AccountModalShell";

type MobileLogoutConfirmProps = {
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function MobileLogoutConfirm({ onClose, onConfirm }: MobileLogoutConfirmProps) {
  return (
    <AccountModalShell
      description="This clears your active session on this device. Your saved lists and theme preference stay on your account."
      kicker="Session"
      title="Log out?"
      onClose={onClose}
    >
      <div className="confirm-actions">
        <button
          className="primary-action danger-action"
          type="button"
          onClick={() => {
            void onConfirm();
          }}
        >
          Log out
        </button>
        <button className="secondary-action" type="button" onClick={onClose}>
          Not now
        </button>
      </div>
    </AccountModalShell>
  );
}
