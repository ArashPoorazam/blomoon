"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

const EARTH_SPIN_INTERRUPT_EVENTS = ["keydown", "mousedown", "pointerdown", "click"] as const;

export function useEarthSpinControls(motionEnabled: boolean) {
  const [earthSpinEnabled, setEarthSpinEnabled] = useState(false);
  const ignoreNextToggle = useRef(false);

  useEffect(() => {
    if (motionEnabled) {
      return;
    }

    setEarthSpinEnabled(false);
  }, [motionEnabled]);

  useEffect(() => {
    if (!earthSpinEnabled) {
      return;
    }

    function stopEarthSpinOnInput(event: Event) {
      if (shouldPreventEarthSpinToggleActivation(event)) {
        event.preventDefault();
      }

      ignoreNextToggle.current ||= shouldIgnoreNextEarthSpinToggle(event);
      setEarthSpinEnabled(false);
    }

    EARTH_SPIN_INTERRUPT_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, stopEarthSpinOnInput, true);
    });
    return () => {
      EARTH_SPIN_INTERRUPT_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, stopEarthSpinOnInput, true);
      });
    };
  }, [earthSpinEnabled]);

  const toggleEarthSpin = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (!motionEnabled) {
      setEarthSpinEnabled(false);
      return;
    }

    if (ignoreNextToggle.current) {
      ignoreNextToggle.current = false;
      return;
    }

    setEarthSpinEnabled((value) => !value);
  }, [motionEnabled]);

  return {
    earthSpinEnabled,
    toggleEarthSpin
  };
}

function shouldIgnoreNextEarthSpinToggle(event: Event) {
  if (!isEarthSpinToggleEvent(event)) {
    return false;
  }

  if (event instanceof KeyboardEvent) {
    return false;
  }

  return !(event instanceof MouseEvent) || event.button === 0;
}

function isEarthSpinToggleEvent(event: Event) {
  return event.target instanceof Element && Boolean(event.target.closest("[data-earth-spin-toggle]"));
}

function shouldPreventEarthSpinToggleActivation(event: Event) {
  return event instanceof KeyboardEvent
    && isEarthSpinToggleEvent(event)
    && (event.code === "Space" || event.code === "Enter");
}
