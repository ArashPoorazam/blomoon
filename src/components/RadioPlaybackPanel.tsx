"use client";

import { LoaderCircle, Pause, Play, Radio, Shuffle, SkipBack, SkipForward, Square } from "lucide-react";
import type { AudioPlaybackController, AudioPlaybackStatus } from "@/lib/modes/useAudioPlayback";
import type { TerraPoint, TerraPointDetail } from "@/lib/modes/types";
import { FavouriteStarButton } from "./favourites/FavouriteStarButton";

type RadioPlaybackPanelProps = {
  detail: TerraPointDetail;
  favourited: boolean;
  playback: AudioPlaybackController;
  playbackLabel: string;
  onToggleFavourite: (point: TerraPoint) => void;
};

export function RadioPlaybackPanel({
  detail,
  favourited,
  onToggleFavourite,
  playback,
  playbackLabel
}: RadioPlaybackPanelProps) {
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
        <FavouriteStarButton
          favourited={favourited}
          point={detail}
          onToggle={onToggleFavourite}
        />
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
  canPlayNext,
  canShuffle,
  loadingRandom,
  onNext,
  onPointOpen,
  onShuffle,
  playback,
  playbackLabel
}: {
  canPlayNext: boolean;
  canShuffle: boolean;
  loadingRandom: boolean;
  onNext: () => void;
  onPointOpen: (point: TerraPoint) => void;
  onShuffle: () => void;
  playback: AudioPlaybackController;
  playbackLabel: string;
}) {
  if (!playback.point) {
    return null;
  }

  const currentPoint = playback.point;

  return (
    <section className="radio-mini-player" aria-label="Current radio playback">
      <div className="radio-mini-main">
        <div className="radio-player-icon" aria-hidden="true">
          <Radio size={18} />
        </div>
        <div className="radio-player-copy">
          <div className="radio-player-kicker">{playbackLabel}</div>
          <button
            className="radio-player-title radio-player-title-button"
            type="button"
            onClick={() => onPointOpen(currentPoint)}
          >
            {currentPoint.name}
          </button>
          <div className="radio-player-status">{formatStatus(playback.status)}</div>
        </div>
      </div>
      <RadioPlaybackControls
        canPlayNext={canPlayNext}
        canShuffle={canShuffle}
        compact
        detail={currentPoint}
        loadingRandom={loadingRandom}
        playback={playback}
        status={playback.status}
        onNext={onNext}
        onShuffle={onShuffle}
      />
      {playback.error ? <div className="radio-player-error">{playback.error}</div> : null}
    </section>
  );
}

function RadioPlaybackControls({
  canPlayNext = false,
  canShuffle = false,
  compact = false,
  detail,
  loadingRandom = false,
  onNext,
  onShuffle,
  playback,
  status
}: {
  canPlayNext?: boolean;
  canShuffle?: boolean;
  compact?: boolean;
  detail: TerraPoint;
  loadingRandom?: boolean;
  onNext?: () => void;
  onShuffle?: () => void;
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
      {compact ? (
        <button
          aria-label="Play previous station"
          className="radio-control icon-only"
          disabled={!playback.canPlayPrevious || isBusy}
          title="Previous"
          type="button"
          onClick={() => {
            void playback.playPrevious();
          }}
        >
          <SkipBack size={16} aria-hidden="true" />
        </button>
      ) : null}
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
      {compact ? (
        <button
          aria-label="Play next station"
          className="radio-control icon-only"
          disabled={!canPlayNext || isBusy}
          title="Next"
          type="button"
          onClick={onNext}
        >
          <SkipForward size={16} aria-hidden="true" />
        </button>
      ) : null}
      {compact ? (
        <button
          aria-label="Shuffle stations"
          className="radio-control icon-only"
          disabled={!canShuffle || isBusy || loadingRandom}
          title="Shuffle"
          type="button"
          onClick={onShuffle}
        >
          {loadingRandom ? (
            <LoaderCircle size={16} aria-hidden="true" className="spin" />
          ) : (
            <Shuffle size={16} aria-hidden="true" />
          )}
        </button>
      ) : null}
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
