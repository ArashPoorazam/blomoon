"use client";

import type { ReactNode } from "react";
import { ModalShell } from "../ui/ModalShell";

type AccountModalShellProps = {
  children: ReactNode;
  description: string;
  kicker?: string;
  className?: string;
  title: string;
  wide?: boolean;
  onClose: () => void;
};

export function AccountModalShell({
  children,
  className = "",
  description,
  kicker,
  title,
  wide = false,
  onClose
}: AccountModalShellProps) {
  return <ModalShell className={`account-modal ${wide ? "wide" : ""} ${className}`} title={title}
    subtitle={description} kicker={kicker} onClose={onClose}>
    {children}
  </ModalShell>;
}
