import type { ShellDrawerView } from "./drawerState";

export const MAIN_DRAWERS = ["mode-switcher", "history", "main", "favourites", "account"] as const;
export type MainDrawer = typeof MAIN_DRAWERS[number];

const owners: Record<ShellDrawerView, MainDrawer> = {
  "mode-switcher": "mode-switcher", history: "history", main: "main",
  favourites: "favourites", "favourite-folder": "favourites",
  account: "account", "account-info": "account", themes: "account", contact: "account",
  "point-detail": "main"
};

export function getMainDrawer(view: ShellDrawerView): MainDrawer { return owners[view]; }
export function getAdjacentMainDrawer(view: ShellDrawerView, direction: number): MainDrawer | null {
  return MAIN_DRAWERS[MAIN_DRAWERS.indexOf(getMainDrawer(view)) + direction] ?? null;
}

export const DRAWER_SETTLE_MS = 240;
const SWIPE_DISTANCE_RATIO = 0.25;
const FLICK_MIN_DISTANCE = 30;
const FLICK_MIN_VELOCITY = 0.5;

export function shouldCommitDrawerSwipe(distance: number, velocity: number, width: number) {
  return Math.abs(distance) >= width * SWIPE_DISTANCE_RATIO ||
    (Math.abs(distance) >= FLICK_MIN_DISTANCE && Math.abs(velocity) >= FLICK_MIN_VELOCITY && Math.sign(distance) === Math.sign(velocity));
}
