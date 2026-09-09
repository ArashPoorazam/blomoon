"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function ModalShell({ children, className = "", kicker, subtitle, onClose, title }: { children: ReactNode; className?: string; kicker?: string; subtitle?: string; onClose: () => void; title: string }) {
  const titleId = useId();
  const subtitleId = useId();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setHost(document.querySelector<HTMLElement>(".blomoon-shell") ?? document.body);
  }, []);
  const ref = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!host) return;
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab") return;
      const controls = [...(ref.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex='0']") ?? [])]
        .filter((element) => element.getClientRects().length > 0);
      const first = controls[0]; const last = controls.at(-1);
      if (!first || !last) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); returnFocus.current?.focus(); };
  }, [host]);
  if (!host) return null;
  return createPortal(
    <div className="favourite-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={ref} className={`favourite-modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subtitle ? subtitleId : undefined} tabIndex={-1}>
        <div className="favourite-picker-header">
          <div>{kicker ? <div className="drawer-kicker">{kicker}</div> : null}<h2 id={titleId}>{title}</h2>{subtitle ? <p id={subtitleId} className="modal-subtitle">{subtitle}</p> : null}</div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}><X size={16} aria-hidden="true" /></button>
        </div>
        {children}
      </section>
    </div>, host
  );
}
