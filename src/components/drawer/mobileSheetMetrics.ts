"use client";

export const DEFAULT_MOBILE_PLAYER_HEIGHT = 92;

const MOBILE_NAV_OFFSET = 72;
const MOBILE_MINIMUM_SHEET_HEIGHT = 118;
const MOBILE_CLOSE_SNAP_HEIGHT = 164;
const MOBILE_FULL_SNAP_DISTANCE = 42;

export type MobileSheetMetrics = {
  closeSnapHeight: number;
  fullSnapHeight: number;
  fullTop: number;
  maximumHeight: number;
  minimumHeight: number;
  playerHeight: number;
  sheetBottom: number;
};

export function getMeasuredMobilePlayerHeight() {
  const playerElement = document.querySelector(".media-mini-player");

  if (!(playerElement instanceof HTMLElement)) {
    return DEFAULT_MOBILE_PLAYER_HEIGHT;
  }

  const height = Math.ceil(playerElement.getBoundingClientRect().height);

  return height > 0 ? height : DEFAULT_MOBILE_PLAYER_HEIGHT;
}

export function getMobileSheetMetrics(playerHeight = getMeasuredMobilePlayerHeight()): MobileSheetMetrics {
  const viewportHeight = window.innerHeight;
  const sheetBottom = viewportHeight - playerHeight;
  const maximumHeight = Math.max(220, sheetBottom - MOBILE_NAV_OFFSET);

  return {
    closeSnapHeight: MOBILE_CLOSE_SNAP_HEIGHT,
    fullSnapHeight: maximumHeight - MOBILE_FULL_SNAP_DISTANCE,
    fullTop: MOBILE_NAV_OFFSET,
    maximumHeight,
    minimumHeight: MOBILE_MINIMUM_SHEET_HEIGHT,
    playerHeight,
    sheetBottom
  };
}

export function clampMobileSheetHeight(height: number, metrics: MobileSheetMetrics) {
  return Math.min(metrics.maximumHeight, Math.max(metrics.minimumHeight, height));
}
