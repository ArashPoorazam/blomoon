"use client";

import { AudioLines, LoaderCircle, Pause, Play, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
    <section className="media-player media-player-detail" aria-label={`${playbackLabel} playback`}>
      <div className="media-player-header">
        <div className="media-player-icon" aria-hidden="true">
          <AudioLines size={18} />
        </div>
        <div className="media-player-copy">
          <div className="media-player-kicker">{playbackLabel}</div>
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
  const currentPoint = playback.point;

  return (
    <section className="media-mini-player" aria-label="Current media playback">
      <div className="media-mini-main">
        <div className="media-player-icon" aria-hidden="true">
          <AudioLines size={18} />
        </div>
        <div className="media-player-copy">
          <div className="media-player-kicker">{playbackLabel}</div>
          {currentPoint ? (
            <button
              className="media-player-title media-player-title-button clickable-text"
              type="button"
              onClick={() => onPointOpen(currentPoint)}
            >
              <MiniOverflowText text={currentPoint.name} />
            </button>
          ) : (
            <div className="media-player-title">No station playing</div>
          )}
          <div className="media-player-description">
            <MiniOverflowText text={currentPoint?.summary ?? "Choose a station or start a random one."} />
          </div>
          {currentPoint ? <div className="media-player-status">{formatAudioPlaybackStatus(playback.status)}</div> : null}
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
  detail: TerraPoint | null;
  itemPluralLabel?: string;
  itemSingularLabel: string;
  loadingRandom?: boolean;
  onNext?: () => void;
  onShuffle?: () => void;
  playback: AudioPlaybackController;
  status: AudioPlaybackStatus;
}) {
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
        disabled={!detail || isBusy}
        onClick={() => {
          if (!detail) {
            return;
          }

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
    </div>
  );
}

function MiniOverflowText({ text }: { text: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const shouldScroll = overflowing && !reducedMotion;

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => setReducedMotion(motionQuery.matches);

    updateReducedMotion();
    motionQuery.addEventListener("change", updateReducedMotion);

    return () => {
      motionQuery.removeEventListener("change", updateReducedMotion);
    };
  }, []);

  useEffect(() => {
    const updateOverflow = () => {
      const container = containerRef.current;
      const textElement = textRef.current;

      if (!container || !textElement) {
        return;
      }

      setOverflowing(textElement.scrollWidth > container.clientWidth + 1);
    };

    updateOverflow();

    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateOverflow);

    if (resizeObserver) {
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      if (textRef.current) {
        resizeObserver.observe(textRef.current);
      }
    }

    window.addEventListener("resize", updateOverflow);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateOverflow);
    };
  }, [text]);

  return (
    <span className="media-mini-overflow" ref={containerRef} title={text}>
      <span className={`media-mini-overflow-track ${shouldScroll ? "scrolling" : ""}`}>
        <span className="media-mini-overflow-item" ref={textRef}>{text}</span>
        {shouldScroll ? <span className="media-mini-overflow-item" aria-hidden="true">{text}</span> : null}
      </span>
    </span>
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
