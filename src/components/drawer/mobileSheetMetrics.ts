import type { DrawerMobilePosition } from "../shell/drawerState";

export const MOBILE_DRAWER_HEADER_HEIGHT = 92;
const MOBILE_DRAWER_HANDLE_HEIGHT = 24;
// Include the sheet’s top border so the collapsed header is not clipped.
const MOBILE_DRAWER_CLOSED_HEIGHT = MOBILE_DRAWER_HEADER_HEIGHT + MOBILE_DRAWER_HANDLE_HEIGHT + 1;

const DEFAULT_MOBILE_NAV_BOTTOM = 72;
const MOBILE_LOADING_SLOT_HEIGHT = 46;
const MOBILE_MIDDLE_VIEWPORT_RATIO = 0.4;
const MOBILE_SWIPE_VELOCITY_THRESHOLD = 0.35;

export type MobileSheetMetrics = {
  closedHeight: number;
  fullHeight: number;
  middleHeight: number;
  navBottom: number;
  playerHeight: number;
  sheetBottom: number;
  viewportHeight: number;
};

export function getMeasuredMobilePlayerHeight() {
  const playerElement = document.querySelector(".media-mini-player");

  if (!(playerElement instanceof HTMLElement)) {
    return 0;
  }

  return Math.max(0, Math.ceil(playerElement.getBoundingClientRect().height));
}

export function getMeasuredMobileNavBottom() {
  const navElement = document.querySelector(".shell-mobile-nav");

  if (!(navElement instanceof HTMLElement)) {
    return DEFAULT_MOBILE_NAV_BOTTOM;
  }

  return Math.max(0, Math.ceil(navElement.getBoundingClientRect().bottom));
}

export function getMobileSheetMetrics({
  navBottom = getMeasuredMobileNavBottom(),
  playerHeight = getMeasuredMobilePlayerHeight(),
  viewportHeight = window.innerHeight
}: {
  navBottom?: number;
  playerHeight?: number;
  viewportHeight?: number;
} = {}): MobileSheetMetrics {
  const sheetBottom = viewportHeight - playerHeight;
  const fullHeight = Math.max(MOBILE_DRAWER_CLOSED_HEIGHT, sheetBottom - navBottom - MOBILE_LOADING_SLOT_HEIGHT);
  const middleHeight = clampMobileSheetHeight(Math.round(viewportHeight * MOBILE_MIDDLE_VIEWPORT_RATIO), {
    closedHeight: MOBILE_DRAWER_CLOSED_HEIGHT,
    fullHeight
  });

  return {
    closedHeight: MOBILE_DRAWER_CLOSED_HEIGHT,
    fullHeight,
    middleHeight,
    navBottom,
    playerHeight,
    sheetBottom,
    viewportHeight
  };
}

export function getMobileDrawerHeight(position: DrawerMobilePosition, metrics: MobileSheetMetrics) {
  return metrics[`${position}Height`];
}

export function clampMobileSheetHeight(
  height: number,
  metrics: Pick<MobileSheetMetrics, "closedHeight" | "fullHeight">
) {
  return Math.min(metrics.fullHeight, Math.max(metrics.closedHeight, height));
}

export function resolveMobileDrawerDetent({
  height,
  heightVelocity,
  metrics
}: {
  height: number;
  heightVelocity: number;
  metrics: MobileSheetMetrics;
}): DrawerMobilePosition {
  const detents = [
    { height: metrics.closedHeight, position: "closed" },
    { height: metrics.middleHeight, position: "middle" },
    { height: metrics.fullHeight, position: "full" }
  ] as const;

  if (heightVelocity >= MOBILE_SWIPE_VELOCITY_THRESHOLD) {
    return detents.find((detent) => detent.height > height + 8)?.position ?? "full";
  }

  if (heightVelocity <= -MOBILE_SWIPE_VELOCITY_THRESHOLD) {
    return [...detents].reverse().find((detent) => detent.height < height - 8)?.position ?? "closed";
  }

  return detents.reduce((nearest, detent) => (
    Math.abs(detent.height - height) < Math.abs(nearest.height - height) ? detent : nearest
  )).position;
}

export function getMobileGlobeOffset(height: number, metrics: MobileSheetMetrics) {
  const effectiveDrawerHeight = Math.min(height, metrics.middleHeight);
  const drawerTop = metrics.sheetBottom - effectiveDrawerHeight;
  const availableCenter = (metrics.navBottom + drawerTop) / 2;
  return Math.round(availableCenter - metrics.viewportHeight / 2);
}

export function getAdjacentDrawerPosition(
  position: DrawerMobilePosition,
  direction: "close" | "open"
): DrawerMobilePosition {
  const positions: DrawerMobilePosition[] = ["closed", "middle", "full"];
  const currentIndex = positions.indexOf(position);
  const nextIndex = direction === "open" ? currentIndex + 1 : currentIndex - 1;
  return positions[Math.min(positions.length - 1, Math.max(0, nextIndex))] ?? position;
}
