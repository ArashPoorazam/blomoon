import { radioMode } from "./radio/mode";
import type { TerraMode } from "./types";

export const terraModes = [
  radioMode
] satisfies TerraMode[];

export const defaultMode = terraModes[0];

export function getTerraMode(id: string) {
  return terraModes.find((mode) => mode.id === id) ?? defaultMode;
}

export function findTerraMode(id: string) {
  return terraModes.find((mode) => mode.id === id) ?? null;
}
