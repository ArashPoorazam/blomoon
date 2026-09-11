import { clampMobileSheetHeight, type MobileSheetMetrics } from "./mobileSheetMetrics";

const DRAG_DISTANCE_RESPONSE = 0.82;
export const DRAWER_DRAG_THRESHOLD = 6;
export const DRAWER_VELOCITY_MAX_AGE = 100;

// Positive finger movement goes down. Only movement beyond scrollTop reaches the sheet.
export function moveDrawerGesture({ deltaY, height, scrollTop, scrollMax, owner, metrics }: {
  deltaY: number;
  height: number;
  scrollTop: number;
  scrollMax: number;
  owner: "list" | "drawer";
  metrics: MobileSheetMetrics;
}) {
  const top = Math.max(0, scrollTop);
  const drawerDelta = owner === "drawer" ? deltaY : Math.max(0, deltaY - top);
  return {
    owner: owner === "drawer" || drawerDelta > 0 ? "drawer" as const : "list" as const,
    height: clampMobileSheetHeight(height - drawerDelta * DRAG_DISTANCE_RESPONSE, metrics),
    scrollTop: owner === "drawer" ? top : Math.max(0, Math.min(scrollMax, top - deltaY))
  };
}

// Exponential decay gives the same travel at different refresh rates. No sheet handoff here.
export function advanceDrawerListMomentum(scrollTop: number, scrollMax: number, velocity: number, elapsed: number) {
  const decay = Math.exp(-Math.min(elapsed, 64) / 240);
  const nextTop = Math.max(0, Math.min(scrollMax, scrollTop + velocity * 240 * (1 - decay)));
  return {
    scrollTop: nextTop,
    velocity: nextTop <= 0 || nextTop >= scrollMax ? 0 : velocity * decay
  };
}
