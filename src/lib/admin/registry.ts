import "server-only";
import { radioAdminAdapter } from "@/lib/modes/radio/adminAdapter";
import { AdminError } from "./access";
import type { AdminModeAdapter } from "./mode-contract";
export const adminModes: AdminModeAdapter[] = [radioAdminAdapter];
export function requireAdminMode(id: string) {
  const mode = adminModes.find((m) => m.descriptor.id === id);
  if (!mode) throw new AdminError(404, "Mode not found.");
  return mode;
}
