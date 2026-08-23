"use client";

import { Pause, Play, Radio, Square, LoaderCircle } from "lucide-react";
import type { AudioPlaybackController, AudioPlaybackStatus } from "@/lib/modes/useAudioPlayback";
import type { TerraPointDetail } from "@/lib/modes/types";

type RadioPlaybackPanelProps = {
  detail: TerraPointDetail;
  playback: AudioPlaybackController;
  playbackLabel: string;
};

export function RadioPlaybackPanel({ detail, playback, playbackLabel }: RadioPlaybackPanelProps) {
  const isCurrentStation = playback.pointId === detail.id;
  const status = isCurrentStation ? playback.status : "idle";

  return (
    <section className="radio-player" aria-label="Radio playback">
      <div className="radio-player-header">
        <div className="radio-player-icon" aria-hidden="true">
          <Radio size={18} />
        </div>
        <div className="radio-player-copy">
          <div className="radio-player-kicker">{playbackLabel}</div>
          <div className="radio-player-title">{detail.name}</div>
          {isCurrentStation ? <div className="radio-player-status">{formatStatus(status)}</div> : null}
        </div>
      </div>

      <RadioPlaybackControls detail={detail} playback={playback} status={status} />

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

export function RadioMiniPlayer({
  playback,
  playbackLabel
}: {
  playback: AudioPlaybackController;
  playbackLabel: string;
}) {
  if (!playback.point) {
    return null;
  }

  return (
    <section className="radio-mini-player" aria-label="Current radio playback">
      <div className="radio-mini-main">
        <div className="radio-player-icon" aria-hidden="true">
          <Radio size={18} />
        </div>
        <div className="radio-player-copy">
          <div className="radio-player-kicker">{playbackLabel}</div>
          <div className="radio-player-title">{playback.point.name}</div>
          <div className="radio-player-status">{formatStatus(playback.status)}</div>
        </div>
      </div>
      <RadioPlaybackControls detail={playback.point} playback={playback} status={playback.status} compact />
      {playback.error ? <div className="radio-player-error">{playback.error}</div> : null}
    </section>
  );
}

function RadioPlaybackControls({
  compact = false,
  detail,
  playback,
  status
}: {
  compact?: boolean;
  detail: TerraPointDetail;
  playback: AudioPlaybackController;
  status: AudioPlaybackStatus;
}) {
  const isCurrentStation = playback.pointId === detail.id;
  const isBusy = status === "loading";
  const isPlaying = status === "playing";
  const isPaused = status === "paused";
  const primaryLabel = isPlaying ? "Pause" : isPaused ? "Resume" : "Play";

  return (
    <div className={`radio-player-controls ${compact ? "compact" : ""}`}>
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
  );
}

function formatMetric(detail: TerraPointDetail, key: string) {
  const value = detail.metrics?.[key];
  return value === undefined || value === null ? "Unknown" : String(value);
}

function formatStatus(status: AudioPlaybackStatus) {
  switch (status) {
    case "loading":
      return "Loading";
    case "playing":
      return "Playing";
    case "paused":
      return "Paused";
    case "error":
      return "Playback error";
    case "idle":
    default:
      return "Ready";
  }
}
