import "server-only";

import type { TerraModeId, TerraPoint } from "@/lib/modes/types";
import { getPointRefKey } from "@/lib/modes/pointKeys";
import { getModePersistenceAdapter } from "./registry";

export type PersistedPointRef = {
  modeId: TerraModeId;
  pointId: string;
};

export class ProviderPointLookupError extends Error {
  constructor(modeId: TerraModeId, options?: ErrorOptions) {
    super(`${modeId} provider point lookup failed.`, options);
  }
}

export async function hydratePersistedPoints(refs: PersistedPointRef[]) {
  const idsByMode = new Map<TerraModeId, Set<string>>();

  for (const { modeId, pointId } of refs) {
    idsByMode.set(modeId, (idsByMode.get(modeId) ?? new Set()).add(pointId));
  }

  const result = new Map<string, TerraPoint>();
  await Promise.all([...idsByMode].map(async ([modeId, ids]) => {
    const adapter = getModePersistenceAdapter(modeId);
    if (!adapter) return;
    const points = await adapter.hydratePoints([...ids]);
    points.forEach((point) => result.set(getPointRefKey({ modeId: point.modeId, pointId: point.id }), point));
  }));
  return result;
}
