"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { getPointKey } from "@/lib/modes/pointKeys";
import type { TerraPoint } from "@/lib/modes/types";

export type CameraFocusRequest = {
  key: string;
  point: TerraPoint;
};

export function useCameraFocusRequest() {
  const requestCount = useRef(0);
  const [request, setRequest] = useState<CameraFocusRequest | null>(null);

  const focusPoint = useCallback((point: TerraPoint) => {
    requestCount.current += 1;
    setRequest({
      key: `${getPointKey(point)}:${requestCount.current}`,
      point
    });
  }, []);

  return useMemo(() => ({
    focusPoint,
    request
  }), [focusPoint, request]);
}
