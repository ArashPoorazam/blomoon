import { useEffect } from "react";
import { findTerraMode } from "../registry";
import type { TerraPoint } from "../types";

/** One bounded request per interval, independent of media events and time updates. */
export function usePlaybackPolicy(point: TerraPoint | null, enabled: boolean, revoke: () => void) {
  useEffect(() => {
    if (!point || !enabled) return;
    const mode = findTerraMode(point.modeId);
    if (!mode) return;
    const lifetime = new AbortController();
    let checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      const signal = AbortSignal.any([lifetime.signal, AbortSignal.timeout(10_000)]);
      try {
        const response = await fetch(mode.detailEndpoint(point.id), { cache: "no-store", signal });
        if (signal.aborted) return;
        if ([401, 403, 404, 503].includes(response.status)) { revoke(); return; }
        if (response.ok) {
          const detail = await response.json();
          if (!signal.aborted && detail?.availability?.status === "disabled") revoke();
        }
      } catch { /* Transient connectivity does not revoke; ApplicationGate monitors account access. */ }
      finally { checking = false; }
    };
    const timer = setInterval(() => void check(), 15_000);
    return () => { lifetime.abort(); clearInterval(timer); };
  }, [point, enabled, revoke]);
}
