"use client";

import { AudioLines, LoaderCircle, Pause, Play, Shuffle, SkipBack, SkipForward, Square } from "lucide-react";
import type { TerraPoint, TerraPointDetail } from "@/lib/modes/types";
import type { AudioPlaybackController, AudioPlaybackStatus } from "@/lib/modes/useAudioPlayback";
import { FavouriteStarButton } from "./favourites/FavouriteStarButton";

type AudioPlaybackPanelProps = {
  detail: TerraPointDetail;
  favourited: boolean;
  itemSingularLabel: string;
  playback: AudioPlaybackController;
  playbackLabel: string;
  onToggleFavourite: (point: TerraPoint) => void;
};

export function AudioPlaybackPanel({
  detail,
  favourited,
  itemSingularLabel,
  onToggleFavourite,
  playback,
  playbackLabel
}: AudioPlaybackPanelProps) {
  const isCurrentItem = playback.pointId === detail.id;
  const status = isCurrentItem ? playback.status : "idle";

  return (
    <section className="media-player" aria-label={`${playbackLabel} playback`}>
      <div className="media-player-header">
        <div className="media-player-icon" aria-hidden="true">
          <AudioLines size={18} />
        </div>
        <div className="media-player-copy">
          <div className="media-player-kicker">{playbackLabel}</div>
          <div className="media-player-title">{detail.name}</div>
          {isCurrentItem ? <div className="media-player-status">{formatAudioPlaybackStatus(status)}</div> : null}
        </div>
        <FavouriteStarButton
          favourited={favourited}
          point={detail}
          onToggle={onToggleFavourite}
        />
      </div>

      <AudioPlaybackControls
        detail={detail}
        itemSingularLabel={itemSingularLabel}
        playback={playback}
        status={status}
      />

      <div className="media-player-meta">
        <span>{formatMetric(detail, "Codec")}</span>
        <span>{formatMetric(detail, "Bitrate")}</span>
      </div>

      {isCurrentItem && playback.error ? (
        <div className="media-player-error">{playback.error}</div>
      ) : null}
    </section>
  );
}

export function AudioMiniPlayer({
  canPlayNext,
  canShuffle,
  itemPluralLabel,
  itemSingularLabel,
  loadingRandom,
  onNext,
  onPointOpen,
  onShuffle,
  playback,
  playbackLabel
}: {
  canPlayNext: boolean;
  canShuffle: boolean;
  itemPluralLabel: string;
  itemSingularLabel: string;
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
    <section className="media-mini-player" aria-label="Current media playback">
      <div className="media-mini-main">
        <div className="media-player-icon" aria-hidden="true">
          <AudioLines size={18} />
        </div>
        <div className="media-player-copy">
          <div className="media-player-kicker">{playbackLabel}</div>
          <button
            className="media-player-title media-player-title-button"
            type="button"
            onClick={() => onPointOpen(currentPoint)}
          >
            {currentPoint.name}
          </button>
          <div className="media-player-status">{formatAudioPlaybackStatus(playback.status)}</div>
        </div>
      </div>
      <AudioPlaybackControls
        canPlayNext={canPlayNext}
        canShuffle={canShuffle}
        compact
        detail={currentPoint}
        itemPluralLabel={itemPluralLabel}
        itemSingularLabel={itemSingularLabel}
        loadingRandom={loadingRandom}
        playback={playback}
        status={playback.status}
        onNext={onNext}
        onShuffle={onShuffle}
      />
      {playback.error ? <div className="media-player-error">{playback.error}</div> : null}
    </section>
  );
}

function AudioPlaybackControls({
  canPlayNext = false,
  canShuffle = false,
  compact = false,
  detail,
  itemPluralLabel = "items",
  itemSingularLabel,
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
  itemPluralLabel?: string;
  itemSingularLabel: string;
  loadingRandom?: boolean;
  onNext?: () => void;
  onShuffle?: () => void;
  playback: AudioPlaybackController;
  status: AudioPlaybackStatus;
}) {
  const isCurrentItem = playback.pointId === detail.id;
  const isBusy = status === "loading";
  const isPlaying = status === "playing";
  const isPaused = status === "paused";
  const primaryLabel = isPlaying ? "Pause" : isPaused ? "Resume" : "Play";

  return (
    <div className={`media-player-controls ${compact ? "compact" : ""}`}>
      {compact ? (
        <button
          aria-label={`Play previous ${itemSingularLabel}`}
          className="media-control icon-only"
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
        className="media-control primary"
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
          aria-label={`Play next ${itemSingularLabel}`}
          className="media-control icon-only"
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
          aria-label={`Shuffle ${itemPluralLabel}`}
          className="media-control icon-only"
          aria-busy={loadingRandom}
          disabled={!canShuffle || isBusy}
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
        className="media-control"
        type="button"
        disabled={!isCurrentItem || status === "idle" || isBusy}
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

export function formatAudioPlaybackStatus(status: AudioPlaybackStatus) {
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
