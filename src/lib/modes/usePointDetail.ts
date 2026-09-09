"use client";

import { useEffect, useState } from "react";
import { getPointKey } from "./pointKeys";
import type { TerraMode, TerraPoint, TerraPointDetail } from "./types";

/** Only explicit inspection supplies a point; previews and playback need no detail request. */
export function usePointDetail(mode: TerraMode, point: TerraPoint | null): TerraPointDetail | null {
  const [loaded, setLoaded] = useState<TerraPointDetail | null>(null);
  useEffect(() => {
    setLoaded(null);
    if (!point) return;
    const controller = new AbortController();
    void fetch(mode.detailEndpoint(point.id), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const detail = await response.json() as TerraPointDetail;
        if (!controller.signal.aborted) setLoaded(detail);
      }).catch(() => { /* The known catalog point remains available if detail resolution fails. */ });
    return () => controller.abort();
  }, [mode, point]);
  if (!point) return null;
  return loaded && getPointKey(loaded) === getPointKey(point) ? loaded : { ...point, fields: [] };
}
