"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appendPlaybackHistory, takePreviousPlaybackPoint } from "./playbackNavigation";
import type { TerraPlaybackConfig, TerraPoint } from "./types";
import { PlaybackError, playbackFailure, playbackFailureMessage, startAudio, validatePlayableAudio } from "./audioStartup";
import { reportPlaybackDiagnostic } from "./playbackDiagnostics";

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

const PLAYABLE_RESOLUTION_TIMEOUT_MS = 20_000;

export function useAudioPlayback(playback: TerraPlaybackConfig | null, onPlaybackStart?: (point: TerraPoint) => void): AudioPlaybackController {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reportedAudioRef = useRef(new WeakSet<HTMLAudioElement>());
  const historyRef = useRef<TerraPoint[]>([]);
  const playRequestRef = useRef(0);
  const resolutionAbortRef = useRef<AbortController | null>(null);
  const onPlaybackStartRef = useRef(onPlaybackStart);
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

  useEffect(() => {
    onPlaybackStartRef.current = onPlaybackStart;
  }, [onPlaybackStart]);

  const setPlaybackState = useCallback((nextState: AudioPlaybackState | ((current: AudioPlaybackState) => AudioPlaybackState)) => {
    const resolvedState = typeof nextState === "function" ? nextState(stateRef.current) : nextState;
    stateRef.current = resolvedState;
    setState(resolvedState);
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

    if (stateRef.current.status === "loading") {
      playRequestRef.current += 1;
      resolutionAbortRef.current?.abort();
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

    if (existingAudio && currentState.pointId === point.id && currentState.status === "playing") return;
    const resume = existingAudio && currentState.pointId === point.id && ["paused", "idle"].includes(currentState.status);

    if (recordHistory && !resume) {
      replaceHistory(appendPlaybackHistory(historyRef.current, currentState.point, point));
    }

    const requestId = playRequestRef.current + 1;
    playRequestRef.current = requestId;
    resolutionAbortRef.current?.abort();
    const resolutionController = new AbortController();
    resolutionAbortRef.current = resolutionController;
    const currentAudio = audioRef.current;

    if (!resume) {
      disposeAudio(currentAudio);
      audioRef.current = null;
    }

    setPlaybackState({
      error: null,
      point,
      pointId: point.id,
      status: "loading"
    });

    let lookupStarted = performance.now();
    let lookupMs = 0;
    let startupStarted: number | null = null;
    let outcomeReported = false;
    const report = (outcome: Parameters<typeof reportPlaybackDiagnostic>[0]["outcome"]) => {
      if (outcomeReported) return;
      outcomeReported = true;
      const audio = audioRef.current;
      reportPlaybackDiagnostic({
        modeId: point.modeId, pointId: point.id, outcome,
        lookupMs: Math.min(300_000, Math.round(startupStarted === null ? performance.now() - lookupStarted : lookupMs)),
        startupMs: Math.min(300_000, Math.round(startupStarted === null ? 0 : performance.now() - startupStarted)),
        mediaErrorCode: audio?.error?.code ?? 0,
        readyState: audio?.readyState ?? 0,
        networkState: audio?.networkState ?? 0
      });
    };

    const manualRefresh = currentState.pointId === point.id && currentState.status === "error";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const attemptController = new AbortController();
      const attemptSignal = AbortSignal.any([resolutionController.signal, attemptController.signal]);
      outcomeReported = false;
      lookupStarted = performance.now();
      startupStarted = null;
      try {
        let audio = attempt === 0 && resume ? existingAudio : null;
        if (!audio) {
          const playable = await fetchPlayableAudio(playback.playableEndpoint(point.id), resolutionController.signal, manualRefresh || attempt > 0);
          if (playRequestRef.current !== requestId) return;
          audio = new Audio();
          audioRef.current = audio;
          audio.preload = "none";
          audio.src = validatePlayableAudio(playable, audio);
        }
        lookupMs = performance.now() - lookupStarted;
        startupStarted = performance.now();
        const activeAudio = audio;
        const isActive = () => playRequestRef.current === requestId && !attemptSignal.aborted;
        const markPlaying = () => {
          if (!isActive()) return;
          setPlaybackState({ error: null, point, pointId: point.id, status: "playing" });
          report("playing");
          if (!reportedAudioRef.current.has(activeAudio)) {
            reportedAudioRef.current.add(activeAudio);
            onPlaybackStartRef.current?.(point);
          }
        };
        const listenerOptions = { signal: attemptSignal };
        audio.addEventListener("playing", markPlaying, listenerOptions);
        audio.addEventListener("pause", () => {
          if (isActive()) setPlaybackState((current) => current.status === "playing" ? { ...current, status: "paused" } : current);
        }, listenerOptions);
        audio.addEventListener("error", () => {
          // Startup errors are handled by startAudio; this handles failures after playback begins.
          if (!isActive() || stateRef.current.status === "loading") return;
          outcomeReported = false;
          const reason = playbackFailure(undefined, activeAudio);
          report(reason);
          resolutionController.abort();
          disposeAudio(activeAudio);
          audioRef.current = null;
          setPlaybackState({ error: playbackFailureMessage(reason), point, pointId: point.id, status: "error" });
        }, listenerOptions);
        audioRef.current = audio;
        await startAudio(audio, attemptSignal);
        markPlaying();
        return;
      } catch (error) {
        if (playRequestRef.current !== requestId || resolutionController.signal.aborted) return;
        const reason = playbackFailure(error, audioRef.current);
        report(reason);
        if (reason === "permission") {
          // Keep the resolved source so the next click calls play() without an intervening fetch.
          setPlaybackState({ error: null, point, pointId: point.id, status: "idle" });
          return;
        }
        attemptController.abort();
        if (attempt === 0 && (reason === "network" || reason === "timeout")) {
          disposeAudio(audioRef.current);
          audioRef.current = null;
          continue;
        }
        resolutionController.abort();
        resolutionAbortRef.current = null;
        disposeAudio(audioRef.current);
        audioRef.current = null;
        setPlaybackState({
          error: playbackFailureMessage(reason),
          point, pointId: point.id, status: "error"
        });
        return;
      }
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

async function fetchPlayableAudio(endpoint: string, signal: AbortSignal, refresh: boolean): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(abort, PLAYABLE_RESOLUTION_TIMEOUT_MS);
  try {
    if (signal.aborted) controller.abort();
    const url = new URL(endpoint, window.location.href);
    if (refresh) url.searchParams.set("refresh", "true");
    const response = await fetch(url.href, { method: "POST", signal: controller.signal });
    if (!response.ok) throw new PlaybackError("lookup");
    return await response.json();
  } catch {
    throw new PlaybackError("lookup");
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}

function disposeAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}
