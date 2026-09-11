"use client";

import { Info, LoaderCircle, Pause, Play } from "lucide-react";
import { useState, type RefObject } from "react";
import type { TerraPoint } from "@/lib/modes/types";

export type CrosshairPlaybackStatus = "idle" | "loading" | "playing" | "buffering" | "stopped" | "paused" | "error";

type MobileCrosshairProps = {
  anchorRef?: RefObject<HTMLElement | null>;
  playbackStatus: CrosshairPlaybackStatus;
  point: TerraPoint | null;
  onInfo: (point: TerraPoint) => void;
  onPause: () => void;
  onPlay: (point: TerraPoint) => void;
};

export function MobileCrosshair({ anchorRef, onInfo, onPause, onPlay, playbackStatus, point: currentPoint }: MobileCrosshairProps) {
  const [retainedPoint, setRetainedPoint] = useState(currentPoint);
  if (currentPoint && currentPoint !== retainedPoint) setRetainedPoint(currentPoint);
  const point = currentPoint ?? retainedPoint;
  const closing = !currentPoint;
  const playbackLoading = playbackStatus === "loading";
  const playbackPlaying = playbackStatus === "playing" || playbackStatus === "buffering";

  return (
    <div className="mobile-crosshair">
      {point ? (
        <section ref={anchorRef} className="crosshair-point-card" data-closing={closing} inert={closing} aria-hidden={closing} onTransitionEnd={() => { if (closing) setRetainedPoint(null); }} aria-label={`Selected station: ${point.name}`}>
          <div className="crosshair-point-copy">
            <strong>{point.name}</strong>
            <span>{point.summary}</span>
          </div>
          <div className="crosshair-point-actions">
            <button aria-label={`View information for ${point.name}`} title="Station information" type="button" onClick={() => onInfo(point)}>
              <Info size={14} aria-hidden="true" />
            </button>
            <button
              aria-label={getPlaybackActionLabel(playbackStatus, point.name)}
              disabled={playbackLoading}
              title={playbackPlaying ? "Pause station" : playbackStatus === "paused" ? "Resume station" : "Play station"}
              type="button"
              onClick={() => playbackPlaying ? onPause() : onPlay(point)}
            >
              {playbackLoading ? (
                <LoaderCircle className="spinning" size={14} aria-hidden="true" />
              ) : playbackPlaying ? (
                <Pause size={14} aria-hidden="true" />
              ) : (
                <Play size={14} aria-hidden="true" />
              )}
            </button>
          </div>
        </section>
      ) : null}
      {!currentPoint ? <span className="crosshair-dot" aria-hidden="true" /> : null}
    </div>
  );
}

function getPlaybackActionLabel(status: CrosshairPlaybackStatus, pointName: string) {
  if (status === "loading") {
    return `Loading ${pointName}`;
  }

  if (status === "playing" || status === "buffering") {
    return `Pause ${pointName}`;
  }

  return `${status === "paused" ? "Resume" : "Play"} ${pointName}`;
}
