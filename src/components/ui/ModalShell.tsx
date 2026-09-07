"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function ModalShell({ children, kicker, onClose, title }: { children: ReactNode; kicker?: string; onClose: () => void; title: string }) {
  const titleId = useId();
  const ref = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, []);
  return (
    <div className="favourite-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={ref} className="favourite-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="favourite-picker-header">
          <div>{kicker ? <div className="drawer-kicker">{kicker}</div> : null}<h2 id={titleId}>{title}</h2></div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}><X size={16} aria-hidden="true" /></button>
        </div>
        {children}
      </section>
    </div>
  );
}
