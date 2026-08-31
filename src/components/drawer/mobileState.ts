export type DrawerMobileState = "closed" | "compact" | "list" | "detail";

export function getDrawerMobileState({
  collapsed,
  expanded,
  hasDetail,
  showingFavourites
}: {
  collapsed: boolean;
  expanded: boolean;
  hasDetail: boolean;
  showingFavourites: boolean;
}): DrawerMobileState {
  if (collapsed) {
    return "closed";
  }

  if (hasDetail) {
    return "detail";
  }

  return expanded || showingFavourites ? "list" : "compact";
}

export function getNextDrawerMobileState(currentState: DrawerMobileState): DrawerMobileState {
  if (currentState === "closed") {
    return "compact";
  }

  if (currentState === "compact") {
    return "list";
  }

  return "closed";
}
