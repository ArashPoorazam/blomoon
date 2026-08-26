"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appendPlaybackHistory, takePreviousPlaybackPoint } from "./playbackNavigation";
import type { TerraPlaybackConfig, TerraPoint } from "./types";

export type AudioPlaybackStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type AudioPlaybackState = {
  error: string | null;
  point: TerraPoint | null;
  pointId: string | null;
  status: AudioPlaybackStatus;
};

export type AudioPlaybackController = AudioPlaybackState & {
  canPlayPrevious: boolean;
  pause: () => void;
  play: (point: TerraPoint) => Promise<void>;
  playPrevious: () => Promise<void>;
  reportError: (message: string) => void;
  stop: () => void;
};

type PlayableAudioResponse = {
  streamUrl: string;
};

export function useAudioPlayback(playback: TerraPlaybackConfig | null): AudioPlaybackController {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<TerraPoint[]>([]);
  const playRequestRef = useRef(0);
  const stateRef = useRef<AudioPlaybackState>({
    error: null,
    point: null,
    pointId: null,
    status: "idle"
  });
  const [state, setState] = useState<AudioPlaybackState>({
    error: null,
    point: null,
    pointId: null,
    status: "idle"
  });
  const [history, setHistory] = useState<TerraPoint[]>([]);

  const setPlaybackState = useCallback((nextState: AudioPlaybackState | ((current: AudioPlaybackState) => AudioPlaybackState)) => {
    if (typeof nextState !== "function") {
      stateRef.current = nextState;
      setState(nextState);
      return;
    }

    setState((currentState) => {
      const resolvedState = nextState(currentState);
      stateRef.current = resolvedState;
      return resolvedState;
    });
  }, []);

  const replaceHistory = useCallback((nextHistory: TerraPoint[]) => {
    historyRef.current = nextHistory;
    setHistory(nextHistory);
  }, []);

  const stop = useCallback(() => {
    playRequestRef.current += 1;
    const audio = audioRef.current;

    disposeAudio(audio);

    audioRef.current = null;
    replaceHistory([]);
    setPlaybackState({
      error: null,
      point: null,
      pointId: null,
      status: "idle"
    });
  }, [replaceHistory, setPlaybackState]);

  const pause = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();
    setPlaybackState((current) => ({
      ...current,
      status: "paused"
    }));
  }, [setPlaybackState]);

  const playPoint = useCallback(async (point: TerraPoint, { recordHistory = true }: { recordHistory?: boolean } = {}) => {
    if (!playback) {
      return;
    }

    const currentState = stateRef.current;
    const existingAudio = audioRef.current;

    if (existingAudio && currentState.pointId === point.id && currentState.status === "paused") {
      try {
        await existingAudio.play();
        setPlaybackState({
          error: null,
          point,
          pointId: point.id,
          status: "playing"
        });
      } catch {
        setPlaybackState({
          error: "Playback was blocked. Press play again.",
          point,
          pointId: point.id,
          status: "error"
        });
      }
      return;
    }

    if (existingAudio && currentState.pointId === point.id && currentState.status === "playing") {
      return;
    }

    if (recordHistory) {
      replaceHistory(appendPlaybackHistory(historyRef.current, currentState.point, point));
    }

    const requestId = playRequestRef.current + 1;
    playRequestRef.current = requestId;
    const currentAudio = audioRef.current;

    disposeAudio(currentAudio);
    audioRef.current = null;

    setPlaybackState({
      error: null,
      point,
      pointId: point.id,
      status: "loading"
    });

    try {
      const response = await fetch(playback.playableEndpoint(point.id), {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("This stream is not playable right now.");
      }

      const playable = (await response.json()) as PlayableAudioResponse;

      if (playRequestRef.current !== requestId) {
        return;
      }

      const audio = new Audio(playable.streamUrl);

      audio.preload = "none";
      audio.addEventListener("playing", () => {
        if (playRequestRef.current !== requestId) {
          return;
        }

        setPlaybackState({
          error: null,
          point,
          pointId: point.id,
          status: "playing"
        });
      });
      audio.addEventListener("pause", () => {
        if (playRequestRef.current !== requestId) {
          return;
        }

        setPlaybackState((current) => current.pointId === point.id && current.status === "playing"
          ? {
              ...current,
              status: "paused"
            }
          : current);
      });
      audio.addEventListener("error", () => {
        if (playRequestRef.current !== requestId) {
          return;
        }

        setPlaybackState({
          error: "The stream stopped or could not be decoded by this browser.",
          point,
          pointId: point.id,
          status: "error"
        });
      });

      audioRef.current = audio;
      await audio.play();
    } catch (error) {
      if (playRequestRef.current !== requestId) {
        return;
      }

      audioRef.current = null;
      setPlaybackState({
        error: error instanceof Error ? error.message : "This stream is not playable right now.",
        point,
        pointId: point.id,
        status: "error"
      });
    }
  }, [playback, replaceHistory, setPlaybackState]);

  const play = useCallback((point: TerraPoint) => playPoint(point), [playPoint]);

  const playPrevious = useCallback(async () => {
    const result = takePreviousPlaybackPoint(historyRef.current, stateRef.current.pointId);

    replaceHistory(result.history);

    if (result.point) {
      await playPoint(result.point, { recordHistory: false });
    }
  }, [playPoint, replaceHistory]);

  const reportError = useCallback((message: string) => {
    setPlaybackState((current) => ({
      ...current,
      error: message,
      status: current.point ? "error" : "idle"
    }));
  }, [setPlaybackState]);

  useEffect(() => {
    if (!playback) {
      stop();
    }
  }, [playback, stop]);

  useEffect(() => () => {
    playRequestRef.current += 1;
    disposeAudio(audioRef.current);
    audioRef.current = null;
  }, []);

  return {
    ...state,
    canPlayPrevious: history.length > 0,
    pause,
    play,
    playPrevious,
    reportError,
    stop
  };
}

function disposeAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}
