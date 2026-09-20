// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { AccountModalShell } from "./AccountModalShell";

it("escapes the account menu stacking context and supports keyboard dismissal", () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const shell = document.createElement("main");
  shell.className = "blomoon-shell";
  const menu = document.createElement("div");
  menu.className = "account-menu";
  shell.append(menu);
  document.body.append(shell);
  const root = createRoot(menu);
  const onClose = vi.fn();
  try {
    act(() => root.render(<AccountModalShell title="Themes" description="Choose your appearance"
      kicker="Appearance" onClose={onClose}><button>Theme option</button></AccountModalShell>));
    const dialog = shell.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(menu.contains(dialog)).toBe(false);
    expect(dialog.parentElement?.parentElement).toBe(shell);
    expect(document.activeElement).toBe(dialog);
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(onClose).toHaveBeenCalledOnce();
  } finally {
    act(() => root.unmount());
    shell.remove();
  }
});
