import type { TerraModeId } from "@/lib/modes/types";

export type ShellDrawerView = "main" | "mode-switcher" | "favourites" | "favourite-folder" | "account" | "account-info" | "themes" | "contact" | "point-detail";
export type ShellDrawerEntry =
  | { kind: Exclude<ShellDrawerView, "favourite-folder" | "point-detail"> }
  | { kind: "favourite-folder"; folderId: string }
  | { kind: "point-detail"; modeId: TerraModeId; pointId: string };
export type DrawerMobilePosition = "closed" | "middle" | "full";
export type ShellDrawerStack = [ShellDrawerEntry, ...ShellDrawerEntry[]];

const ROOT: ShellDrawerEntry = { kind: "main" };
const accountChildViews = new Set<ShellDrawerView>(["account-info", "themes", "contact"]);
export function isAccountDrawerView(view: ShellDrawerView) { return view === "account" || accountChildViews.has(view); }
export function toDrawerEntry(entry: ShellDrawerEntry | Exclude<ShellDrawerView, "favourite-folder" | "point-detail">): ShellDrawerEntry { return typeof entry === "string" ? { kind: entry } : entry; }
export function createDrawerStack(entry: ShellDrawerEntry | Exclude<ShellDrawerView, "favourite-folder" | "point-detail">): ShellDrawerStack {
  const next = toDrawerEntry(entry); if (next.kind === "main") return [ROOT];
  if (accountChildViews.has(next.kind)) return [ROOT, { kind: "account" }, next];
  return [ROOT, next];
}
export function getCurrentDrawerEntry(stack: ShellDrawerStack) { return stack.at(-1) ?? ROOT; }
export function getCurrentDrawerView(stack: ShellDrawerStack): ShellDrawerView { return getCurrentDrawerEntry(stack).kind; }
export function openDrawerStackView(stack: ShellDrawerStack, entry: ShellDrawerEntry): ShellDrawerStack {
  if (entry.kind !== "point-detail" && entry.kind !== "favourite-folder") return createDrawerStack(entry);
  const current = getCurrentDrawerEntry(stack); const parent = current.kind === entry.kind ? popDrawerStack(stack) : stack;
  return [...parent, entry] as ShellDrawerStack;
}
export function popDrawerStack(stack: ShellDrawerStack): ShellDrawerStack { return stack.length <= 1 ? [ROOT] : stack.slice(0, -1) as ShellDrawerStack; }
export function canGoBackFromDrawerStack(stack: ShellDrawerStack) { return stack.length > 1; }
export function resolveDrawerMobilePosition({ currentPosition, requestedOpenPosition }: { currentPosition: DrawerMobilePosition; requestedOpenPosition: DrawerMobilePosition }) { return currentPosition === "closed" ? requestedOpenPosition : currentPosition; }
