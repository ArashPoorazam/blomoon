"use client";

import type { ReactNode } from "react";
import { ModalShell } from "../ui/ModalShell";

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
  return <ModalShell className={`account-modal ${wide ? "wide" : ""}`} title={title}
    subtitle={description} kicker={kicker} onClose={onClose}>
    {children}
  </ModalShell>;
}
