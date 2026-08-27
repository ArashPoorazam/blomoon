"use client";

import { X } from "lucide-react";
import { useEffect, type MouseEvent, type ReactNode } from "react";

type AccountModalShellProps = {
  children: ReactNode;
  description: string;
  kicker: string;
  title: string;
  wide?: boolean;
  onClose: () => void;
};

export function AccountModalShell({
  children,
  description,
  kicker,
  title,
  wide = false,
  onClose
}: AccountModalShellProps) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function closeOnBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={closeOnBackdrop}>
      <div
        className={`account-modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
        aria-describedby="account-modal-description"
      >
        <div className="modal-header">
          <div>
            <div className="drawer-kicker">{kicker}</div>
            <h2 id="account-modal-title">{title}</h2>
            <p id="account-modal-description" className="account-modal-description">
              {description}
            </p>
          </div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
