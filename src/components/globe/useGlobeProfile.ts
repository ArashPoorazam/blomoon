"use client";

import { useEffect, useState } from "react";
import { GLOBE_DISPLAY_BUDGET, type GlobeDisplayProfile } from "@/lib/modes/displayBudget";

export type GlobeProfile = {
  dpr: [number, number];
  hoverEnabled: boolean;
  markerBudget: number;
  motionEnabled: boolean;
  profile: GlobeDisplayProfile;
};

const DESKTOP_PROFILE: GlobeProfile = {
  dpr: [1, 2],
  hoverEnabled: true,
  markerBudget: GLOBE_DISPLAY_BUDGET.desktop,
  motionEnabled: true,
  profile: "desktop"
};

export function useGlobeProfile(): GlobeProfile {
  const [profile, setProfile] = useState(DESKTOP_PROFILE);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 760px), (pointer: coarse)");
    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function syncProfile() {
      const isMobile = mobileQuery.matches;
      const isCoarse = coarseQuery.matches;
      const reducedMotion = reducedMotionQuery.matches;

      setProfile({
        dpr: isMobile ? [1, 1.35] : [1, 2],
        hoverEnabled: !isCoarse,
        markerBudget: isMobile ? GLOBE_DISPLAY_BUDGET.mobile : GLOBE_DISPLAY_BUDGET.desktop,
        motionEnabled: !isCoarse && !reducedMotion,
        profile: isMobile ? "mobile" : "desktop"
      });
    }

    syncProfile();
    mobileQuery.addEventListener("change", syncProfile);
    coarseQuery.addEventListener("change", syncProfile);
    reducedMotionQuery.addEventListener("change", syncProfile);

    return () => {
      mobileQuery.removeEventListener("change", syncProfile);
      coarseQuery.removeEventListener("change", syncProfile);
      reducedMotionQuery.removeEventListener("change", syncProfile);
    };
  }, []);

  return profile;
}
