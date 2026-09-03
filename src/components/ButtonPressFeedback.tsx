"use client";

import { useEffect, type RefObject } from "react";

const PRESS_FEEDBACK_CLASS = "press-feedback-active";
const PRESS_FEEDBACK_TIMEOUT_MS = 260;
const PRESS_FEEDBACK_BUTTON_SELECTOR = [
  ".account-menu-trigger",
  ".shell-square-control",
  ".shell-mobile-nav-button",
  ".shell-mobile-logo-button",
  ".drawer-toggle",
  ".drawer-sheet-handle",
  ".icon-button",
  ".media-control",
  ".media-player-title-button",
  ".point-row-main",
  ".point-list-more",
  ".favourite-star",
  ".favourite-row-main",
  ".favourite-remove",
  ".search-clear",
  ".filter-toggle",
  ".filter-menu-trigger",
  ".filter-menu-options button",
  ".filter-chip",
  ".directory-load-more",
  ".point-action-trigger",
  ".point-action-popover button",
  ".account-action-list button",
  ".account-drawer-actions button",
  ".primary-action",
  ".secondary-action",
  ".text-action",
  ".theme-option",
  ".favourite-picker-option",
  ".mode-switcher-option"
].join(",");

type ButtonPressFeedbackProps = {
  rootRef: RefObject<HTMLElement | null>;
};

export function ButtonPressFeedback({ rootRef }: ButtonPressFeedbackProps) {
  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const activeButtons = new Set<HTMLButtonElement>();
    const timers = new WeakMap<HTMLButtonElement, number>();

    const clearButton = (button: HTMLButtonElement) => {
      const timer = timers.get(button);

      if (timer !== undefined) {
        window.clearTimeout(timer);
        timers.delete(button);
      }

      button.classList.remove(PRESS_FEEDBACK_CLASS);
      activeButtons.delete(button);
    };

    const triggerButton = (button: HTMLButtonElement) => {
      if (button.disabled) {
        return;
      }

      clearButton(button);
      void button.offsetWidth;
      button.classList.add(PRESS_FEEDBACK_CLASS);
      activeButtons.add(button);

      timers.set(button, window.setTimeout(() => clearButton(button), PRESS_FEEDBACK_TIMEOUT_MS));
    };

    const getButton = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        return null;
      }

      const button = target.closest("button");

      return button instanceof HTMLButtonElement && root.contains(button) && button.matches(PRESS_FEEDBACK_BUTTON_SELECTOR) ? button : null;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const button = getButton(event.target);

      if (button) {
        triggerButton(button);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== "Enter" && event.key !== " ")) {
        return;
      }

      const button = getButton(event.target);

      if (button) {
        triggerButton(button);
      }
    };

    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName !== "press-feedback-fade") {
        return;
      }

      const button = getButton(event.target);

      if (button) {
        clearButton(button);
      }
    };

    root.addEventListener("pointerdown", onPointerDown, true);
    root.addEventListener("keydown", onKeyDown, true);
    root.addEventListener("animationend", onAnimationEnd, true);

    return () => {
      root.removeEventListener("pointerdown", onPointerDown, true);
      root.removeEventListener("keydown", onKeyDown, true);
      root.removeEventListener("animationend", onAnimationEnd, true);
      activeButtons.forEach(clearButton);
    };
  }, [rootRef]);

  return null;
}
