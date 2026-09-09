"use client";

import { createPortal } from "react-dom";
import { MoreVertical, type LucideIcon } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export type AnchoredMenuItem = { icon: LucideIcon; label: string; onSelect: () => void; tone?: "danger" };

export function AnchoredMenu({ label, items }: { label: string; items: AnchoredMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const id = useId(); const triggerRef = useRef<HTMLButtonElement>(null); const menuRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect(); const width = 164; const height = items.length * 38 + 12;
    setPosition({ left: Math.max(8, rect.left - width - 8), top: Math.min(Math.max(8, rect.top + rect.height / 2 - height / 2), window.innerHeight - height - 8) });
  }, [items.length, open]);
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const outside = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const dismiss = () => setOpen(false);
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("focusin", outside);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("blur", dismiss);
    return () => {
      window.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("focusin", outside);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("blur", dismiss);
    };
  }, [open]);
  function close(returnFocus = true) { setOpen(false); if (returnFocus) requestAnimationFrame(() => triggerRef.current?.focus()); }
  return <>
    <button ref={triggerRef} aria-controls={id} aria-expanded={open} aria-haspopup="menu" aria-label={label} className="point-action-trigger" type="button" onClick={() => setOpen((value) => !value)}><MoreVertical size={16} aria-hidden="true" /></button>
    {open ? createPortal(
      <div ref={menuRef} className="point-action-popover anchored" id={id} role="menu" style={{ left: position.left, top: position.top }} onKeyDown={(event) => {
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")]; const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (event.key === "Escape") { event.preventDefault(); close(); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
        if (event.key === "Home") { event.preventDefault(); buttons[0]?.focus(); }
        if (event.key === "End") { event.preventDefault(); buttons.at(-1)?.focus(); }
      }}>
        {items.map(({ icon: Icon, label: itemLabel, onSelect, tone }) => <button className={tone === "danger" ? "danger" : undefined} key={itemLabel} role="menuitem" type="button" onClick={() => { close(false); onSelect(); }}><Icon size={14} aria-hidden="true" /><span>{itemLabel}</span></button>)}
      </div>, triggerRef.current?.closest(".blomoon-shell") ?? document.body) : null}
  </>;
}
