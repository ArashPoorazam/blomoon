export type ShellDrawerView =
  | "main"
  | "mode-switcher"
  | "favourites"
  | "account"
  | "account-info"
  | "themes"
  | "contact"
  | "point-detail";

export type DrawerMobilePosition = "closed" | "standard" | "full";

export function isAccountDrawerView(view: ShellDrawerView) {
  return view === "account" || view === "account-info" || view === "themes" || view === "contact";
}
