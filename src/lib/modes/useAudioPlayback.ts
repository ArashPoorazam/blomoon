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

const PLAYABLE_RESOLUTION_TIMEOUT_MS = 20_000;
const AUDIO_START_TIMEOUT_MS = 12_000;

export function useAudioPlayback(playback: TerraPlaybackConfig | null): AudioPlaybackController {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<TerraPoint[]>([]);
  const playRequestRef = useRef(0);
  const resolutionAbortRef = useRef<AbortController | null>(null);
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
    resolutionAbortRef.current?.abort();
    resolutionAbortRef.current = null;
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
        await startAudio(existingAudio);
        setPlaybackState({
          error: null,
          point,
          pointId: point.id,
          status: "playing"
        });
      } catch {
        setPlaybackState({
          error: "Playback was blocked or took too long to start. Press play again.",
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
    resolutionAbortRef.current?.abort();
    const resolutionController = new AbortController();
    resolutionAbortRef.current = resolutionController;
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
      const response = await fetchPlayableAudio(playback.playableEndpoint(point.id), resolutionController);

      if (resolutionAbortRef.current === resolutionController) {
        resolutionAbortRef.current = null;
      }

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
      await startAudio(audio);

      if (playRequestRef.current === requestId) {
        setPlaybackState((current) => current.pointId === point.id && current.status === "loading"
          ? {
              error: null,
              point,
              pointId: point.id,
              status: "playing"
            }
          : current);
      }
    } catch (error) {
      if (playRequestRef.current !== requestId) {
        return;
      }

      if (resolutionAbortRef.current === resolutionController) {
        resolutionAbortRef.current = null;
      }
      disposeAudio(audioRef.current);
      audioRef.current = null;
      setPlaybackState({
        error: getPlaybackErrorMessage(error),
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
    resolutionAbortRef.current?.abort();
    resolutionAbortRef.current = null;
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

async function fetchPlayableAudio(endpoint: string, controller: AbortController) {
  const timeout = window.setTimeout(() => controller.abort(), PLAYABLE_RESOLUTION_TIMEOUT_MS);

  try {
    return await fetch(endpoint, {
      method: "POST",
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function startAudio(audio: HTMLAudioElement) {
  let timeout: number | null = null;

  try {
    await Promise.race([
      audio.play(),
      new Promise<never>((_, reject) => {
        timeout = window.setTimeout(() => {
          reject(new Error("Playback took too long to start. Try another station."));
        }, AUDIO_START_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeout !== null) {
      window.clearTimeout(timeout);
    }
  }
}

function getPlaybackErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") {
    return "Station lookup took too long. Try another station.";
  }

  return error instanceof Error ? error.message : "This stream is not playable right now.";
}

function disposeAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}
