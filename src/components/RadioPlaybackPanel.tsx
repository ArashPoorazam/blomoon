"use client";

import { Pause, Play, Radio, Square, LoaderCircle } from "lucide-react";
import type { AudioPlaybackController } from "@/lib/modes/useAudioPlayback";
import type { TerraPointDetail } from "@/lib/modes/types";

type RadioPlaybackPanelProps = {
  detail: TerraPointDetail;
  playback: AudioPlaybackController;
  playbackLabel: string;
};

export function RadioPlaybackPanel({ detail, playback, playbackLabel }: RadioPlaybackPanelProps) {
  const isCurrentStation = playback.pointId === detail.id;
  const status = isCurrentStation ? playback.status : "idle";
  const isBusy = status === "loading";
  const isPlaying = status === "playing";
  const isPaused = status === "paused";
  const primaryLabel = isPlaying ? "Pause" : isPaused ? "Resume" : "Play";

  return (
    <section className="radio-player" aria-label="Radio playback">
      <div className="radio-player-header">
        <div className="radio-player-icon" aria-hidden="true">
          <Radio size={18} />
        </div>
        <div className="radio-player-copy">
          <div className="radio-player-kicker">{playbackLabel}</div>
          <div className="radio-player-title">{detail.name}</div>
        </div>
      </div>

      <div className="radio-player-controls">
        <button
          className="radio-control primary"
          type="button"
          disabled={isBusy}
          onClick={() => {
            if (isPlaying) {
              playback.pause();
              return;
            }

            void playback.play(detail);
          }}
        >
          {isBusy ? (
            <LoaderCircle size={16} aria-hidden="true" className="spin" />
          ) : isPlaying ? (
            <Pause size={16} aria-hidden="true" />
          ) : (
            <Play size={16} aria-hidden="true" />
          )}
          <span>{isBusy ? "Loading" : primaryLabel}</span>
        </button>
        <button
          className="radio-control"
          type="button"
          disabled={!isCurrentStation || status === "idle" || isBusy}
          onClick={playback.stop}
        >
          <Square size={15} aria-hidden="true" />
          <span>Stop</span>
        </button>
      </div>

      <div className="radio-player-meta">
        <span>{formatMetric(detail, "Codec")}</span>
        <span>{formatMetric(detail, "Bitrate")}</span>
      </div>

      {isCurrentStation && playback.error ? (
        <div className="radio-player-error">{playback.error}</div>
      ) : null}
    </section>
  );
}

function formatMetric(detail: TerraPointDetail, key: string) {
  const value = detail.metrics?.[key];
  return value === undefined || value === null ? "Unknown" : String(value);
}
