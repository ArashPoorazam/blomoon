"use client";

import { Info, LoaderCircle, Play } from "lucide-react";
import type { TerraPoint } from "@/lib/modes/types";

type MobileCrosshairProps = {
  metric: string | null;
  playbackLoading: boolean;
  point: TerraPoint | null;
  onInfo: (point: TerraPoint) => void;
  onPlay: (point: TerraPoint) => void;
};

export function MobileCrosshair({ metric, onInfo, onPlay, playbackLoading, point }: MobileCrosshairProps) {
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
            <button type="button" onClick={() => onInfo(point)}>
              <Info size={14} aria-hidden="true" />
              <span>Info</span>
            </button>
            <button disabled={playbackLoading} type="button" onClick={() => onPlay(point)}>
              {playbackLoading ? (
                <LoaderCircle className="spinning" size={14} aria-hidden="true" />
              ) : (
                <Play size={14} aria-hidden="true" />
              )}
              <span>Play</span>
            </button>
          </div>
        </section>
      ) : null}
      <span className="crosshair-dot" aria-hidden="true" />
    </div>
  );
}
