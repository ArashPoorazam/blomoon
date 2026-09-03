"use client";

import { useEffect, useState } from "react";
import {
  GLOBE_COUNTRY_POINT_GUARANTEE,
  GLOBE_DISPLAY_BUDGET
} from "@/lib/modes/displayBudget";
import { MAX_CAMERA_DISTANCE, MOBILE_MAX_CAMERA_DISTANCE } from "./globeMath";

export type GlobeProfile = {
  countryPointGuarantee: number;
  dpr: [number, number];
  hoverEnabled: boolean;
  maxCameraDistance: number;
  markerBudget: number;
  motionEnabled: boolean;
  profile: "desktop" | "mobile";
};

const DESKTOP_PROFILE: GlobeProfile = {
  countryPointGuarantee: GLOBE_COUNTRY_POINT_GUARANTEE,
  dpr: [1, 2],
  hoverEnabled: true,
  maxCameraDistance: MAX_CAMERA_DISTANCE,
  markerBudget: GLOBE_DISPLAY_BUDGET,
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
        countryPointGuarantee: GLOBE_COUNTRY_POINT_GUARANTEE,
        dpr: isMobile ? [1, 1.35] : [1, 2],
        hoverEnabled: !isCoarse,
        maxCameraDistance: isMobile ? MOBILE_MAX_CAMERA_DISTANCE : MAX_CAMERA_DISTANCE,
        markerBudget: GLOBE_DISPLAY_BUDGET,
        motionEnabled: !reducedMotion,
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
