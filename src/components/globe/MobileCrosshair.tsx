"use client";

import { Info, LoaderCircle, Pause, Play } from "lucide-react";
import type { TerraPoint } from "@/lib/modes/types";

export type CrosshairPlaybackStatus = "idle" | "loading" | "playing" | "paused" | "error";

type MobileCrosshairProps = {
  metric: string | null;
  playbackStatus: CrosshairPlaybackStatus;
  point: TerraPoint | null;
  onInfo: (point: TerraPoint) => void;
  onPause: () => void;
  onPlay: (point: TerraPoint) => void;
};

export function MobileCrosshair({ metric, onInfo, onPause, onPlay, playbackStatus, point }: MobileCrosshairProps) {
  const playbackLoading = playbackStatus === "loading";
  const playbackPlaying = playbackStatus === "playing";

  return (
    <div className="mobile-crosshair">
      {point ? (
        <section className="crosshair-point-card" aria-label={`Selected station: ${point.name}`}>
          <div className="crosshair-point-copy">
            <strong>{point.name}</strong>
            <span>{point.summary}</span>
            {metric ? <small>{metric}</small> : null}
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
      {!point ? <span className="crosshair-dot" aria-hidden="true" /> : null}
    </div>
  );
}

function getPlaybackActionLabel(status: CrosshairPlaybackStatus, pointName: string) {
  if (status === "loading") {
    return `Loading ${pointName}`;
  }

  if (status === "playing") {
    return `Pause ${pointName}`;
  }

  return `${status === "paused" ? "Resume" : "Play"} ${pointName}`;
}
