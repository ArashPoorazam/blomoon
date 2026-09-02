export type ShellDrawerView =
  | "main"
  | "mode-switcher"
  | "favourites"
  | "account"
  | "account-info"
  | "themes"
  | "contact"
  | "point-detail";

export type DrawerMobilePosition = "closed" | "standard" | "custom" | "full";

export type ShellDrawerStack = [ShellDrawerView, ...ShellDrawerView[]];

const ROOT_DRAWER_VIEW = "main" satisfies ShellDrawerView;
const accountChildViews = new Set<ShellDrawerView>(["account-info", "themes", "contact"]);

export function isAccountDrawerView(view: ShellDrawerView) {
  return view === "account" || view === "account-info" || view === "themes" || view === "contact";
}

export function createDrawerStack(view: ShellDrawerView): ShellDrawerStack {
  if (view === ROOT_DRAWER_VIEW) {
    return [ROOT_DRAWER_VIEW];
  }

  if (accountChildViews.has(view)) {
    return [ROOT_DRAWER_VIEW, "account", view];
  }

  return [ROOT_DRAWER_VIEW, view];
}

export function getCurrentDrawerView(stack: ShellDrawerStack): ShellDrawerView {
  return stack[stack.length - 1] ?? ROOT_DRAWER_VIEW;
}

export function openDrawerStackView(stack: ShellDrawerStack, view: ShellDrawerView): ShellDrawerStack {
  if (view !== "point-detail") {
    return createDrawerStack(view);
  }

  const parentStack = getCurrentDrawerView(stack) === "point-detail" ? popDrawerStack(stack) : stack;
  return [...parentStack, "point-detail"] as ShellDrawerStack;
}

export function popDrawerStack(stack: ShellDrawerStack): ShellDrawerStack {
  if (stack.length <= 1) {
    return [ROOT_DRAWER_VIEW];
  }

  return stack.slice(0, -1) as ShellDrawerStack;
}

export function canGoBackFromDrawerStack(stack: ShellDrawerStack) {
  return stack.length > 1;
}
