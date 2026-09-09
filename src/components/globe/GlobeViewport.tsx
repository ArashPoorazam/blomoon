"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ComponentProps, type Ref } from "react";
import type { TerraPoint } from "@/lib/modes/types";
import { getPointKey } from "@/lib/modes/pointKeys";
import { GlobeScene } from "../GlobeScene";
import { MobileCrosshair, type CrosshairPlaybackStatus } from "./MobileCrosshair";

export type GlobeViewportHandle = { clearPreview: () => void };
type GlobeViewportProps = Omit<ComponentProps<typeof GlobeScene>, "anchorPoint" | "anchorTarget" | "onCrosshairPoint" | "onGlobeInteractionStart"> & {
  ref: Ref<GlobeViewportHandle>;
  playbackStatus: CrosshairPlaybackStatus;
  playbackPoint: TerraPoint | null;
  onInspect: (point: TerraPoint) => void;
  onPlayInPlace: (point: TerraPoint) => void;
  onPause: () => void;
};

/** Preview is local presentation: acquiring a marker never selects or fetches details. */
export function GlobeViewport({ ref, crosshairEnabled, focusKey, playbackStatus, playbackPoint, onInspect, onPlayInPlace, onPause, ...scene }: GlobeViewportProps) {
  const [preview, setPreview] = useState<TerraPoint | null>(null);
  const anchor = useRef<HTMLElement>(null);
  const clearPreview = useCallback(() => setPreview(null), []);
  useImperativeHandle(ref, () => ({ clearPreview }), [clearPreview]);
  useEffect(clearPreview, [clearPreview, crosshairEnabled, focusKey]);
  const status = preview && playbackPoint && getPointKey(preview) === getPointKey(playbackPoint)
    ? playbackStatus : "idle";

  return <div className="globe-stage">
    <GlobeScene
      {...scene}
      focusKey={focusKey}
      selectedPoint={crosshairEnabled && preview ? preview : scene.selectedPoint}
      anchorPoint={crosshairEnabled ? preview : null}
      anchorTarget={anchor}
      crosshairEnabled={crosshairEnabled && !preview}
      onCrosshairPoint={setPreview}
      onGlobeInteractionStart={clearPreview}
    />
    {crosshairEnabled ? <MobileCrosshair anchorRef={anchor} point={preview} playbackStatus={status}
      onInfo={onInspect} onPause={onPause} onPlay={onPlayInPlace} /> : null}
  </div>;
}
