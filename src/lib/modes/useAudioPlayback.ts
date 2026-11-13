"use client";

// Compatibility facade for the existing radio UI and plugins.
export { usePlaybackCoordinator as useAudioPlayback } from "./usePlaybackCoordinator";
export type {
  PlaybackController as AudioPlaybackController,
  PlaybackState as AudioPlaybackState,
  PlaybackStatus as AudioPlaybackStatus,
} from "./usePlaybackCoordinator";
