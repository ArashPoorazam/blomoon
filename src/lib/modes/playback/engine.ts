import type { PlaybackDescriptor, PlaybackSource } from "./descriptor";

export type EngineEvent = "playing" | "buffering" | "paused" | "ended" | "error";
export type EngineSnapshot = { mediaErrorCode: number; readyState: number; networkState: number };

/** Engines own media resources; the coordinator owns session identity, policy and retries. */
export interface PlaybackEngine {
  start(signal: AbortSignal, timeoutMs: number): Promise<void>;
  subscribe(listener: (event: EngineEvent) => void, signal: AbortSignal): void;
  pause(): void;
  seek(seconds: number): boolean;
  setRate(rate: number): boolean;
  snapshot(): EngineSnapshot;
  dispose(): void;
}

export type PlaybackEngineFactory = (descriptor: PlaybackDescriptor, source: PlaybackSource) => PlaybackEngine;
