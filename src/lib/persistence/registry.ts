import "server-only";

import { radioPersistenceAdapter } from "@/lib/persistence/radio";
import type { TerraModeId } from "@/lib/modes/types";
import type { ModePersistenceAdapter } from "./types";

const modePersistenceAdapters = [
  radioPersistenceAdapter
] satisfies ModePersistenceAdapter[];

export function getModePersistenceAdapter(modeId: TerraModeId | string) {
  return modePersistenceAdapters.find((adapter) => adapter.modeId === modeId) ?? null;
}
