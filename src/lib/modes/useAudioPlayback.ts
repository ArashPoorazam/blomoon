"use client";
import { findTerraMode } from "./registry";

import { useCallback, useEffect, useRef, useState } from "react";
import { appendPlaybackHistory, takePreviousPlaybackPoint } from "./playbackNavigation";
import type { TerraAudioSource, TerraPlaybackConfig, TerraPoint } from "./types";
import { PlaybackError, playbackFailure, playbackFailureMessage, startAudio, validatePlayableAudio } from "./audioStartup";
import { fetchAudioSources } from "./audioResolution";
import { reportPlaybackDiagnostic } from "./playbackDiagnostics";

export type AudioPlaybackStatus = "idle" | "loading" | "playing" | "buffering" | "paused" | "stopped" | "error";
export type AudioPlaybackState = { error: string | null; point: TerraPoint | null; pointId: string | null; status: AudioPlaybackStatus };
export type AudioPlaybackController = AudioPlaybackState & {
  canPlayPrevious: boolean; pause: () => void; play: (point: TerraPoint) => Promise<void>;
  playPrevious: () => Promise<void>; reportError: (message: string) => void; stop: () => void;
};
type Session = {
  id: string; point: TerraPoint; controller: AbortController; audio: HTMLAudioElement | null;
  sources: TerraAudioSource[]; index: number; recorded: boolean;
};
const empty: AudioPlaybackState = { error: null, point: null, pointId: null, status: "idle" };

export function useAudioPlayback(playback: TerraPlaybackConfig | null, onPlaybackStart?: (point: TerraPoint) => void): AudioPlaybackController {
  const sessionRef = useRef<Session | null>(null);
  const historyRef = useRef<TerraPoint[]>([]);
  const stateRef = useRef<AudioPlaybackState>(empty);
  const onStartRef = useRef(onPlaybackStart);
  const [state, setState] = useState(empty);
  const [history, setHistory] = useState<TerraPoint[]>([]);
  useEffect(() => { onStartRef.current = onPlaybackStart; }, [onPlaybackStart]);
  const update = useCallback((next: AudioPlaybackState) => { stateRef.current = next; setState(next); }, []);
  const replaceHistory = useCallback((next: TerraPoint[]) => { historyRef.current = next; setHistory(next); }, []);
  const cancel = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) { session.controller.abort(); disposeAudio(session.audio); }
  }, []);
  const stop = useCallback(() => { cancel(); replaceHistory([]); update(empty); }, [cancel, replaceHistory, update]);
  const pause = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    // Pause can cancel startup as well as an established connection.
    session.controller.abort();
    session.audio?.pause();
    update({ ...stateRef.current, status: "paused" });
  }, [update]);

  const playPoint = useCallback(async (point: TerraPoint, recordHistory = true) => {
    if (!playback) return;
    const previous = stateRef.current;
    let session = sessionRef.current;
    if (session?.point.id === point.id && ["playing", "buffering", "loading"].includes(previous.status)) return;
    const resume = session?.point.id === point.id && ["paused", "idle"].includes(previous.status);
    if (!resume || !session) {
      if (recordHistory) replaceHistory(appendPlaybackHistory(historyRef.current, previous.point, point));
      cancel();
      session = { id: crypto.randomUUID(), point, controller: new AbortController(), audio: null, sources: [], index: 0, recorded: false };
      sessionRef.current = session;
    } else {
      session.controller.abort();
      session.controller = new AbortController();
    }
    const active = session;
    const signal = active.controller.signal;
    const isActive = () => sessionRef.current === active && !signal.aborted;
    update({ error: null, point, pointId: point.id, status: "loading" });
    const lookupStarted = performance.now();
    let lookupMs = 0;
    let startupStarted: number | null = null;
    let resolutionStatus = 0;
    let reportedPlaying = false;
    const report = (outcome: Parameters<typeof reportPlaybackDiagnostic>[0]["outcome"], stage: "resolution" | "startup" | "playback") => {
      reportPlaybackDiagnostic({ modeId: point.modeId, pointId: point.id, sessionId: active.id, outcome, stage,
        sourceIndex: active.index, resolutionStatus,
        lookupMs: Math.min(300_000, Math.round(startupStarted === null ? performance.now() - lookupStarted : lookupMs)),
        startupMs: Math.min(300_000, Math.round(startupStarted === null ? 0 : performance.now() - startupStarted)),
        mediaErrorCode: active.audio?.error?.code ?? 0, readyState: active.audio?.readyState ?? 0, networkState: active.audio?.networkState ?? 0 });
    };
    const fail = (error: unknown, stage: "resolution" | "startup" | "playback") => {
      const reason = playbackFailure(error, active.audio);
      report(reason, stage);
      active.controller.abort();
      disposeAudio(active.audio); active.audio = null;
      update({ error: playbackFailureMessage(reason), point, pointId: point.id, status: "error" });
    };
    try {
      if (!active.sources.length) {
        active.sources = await fetchAudioSources(playback.playableEndpoint(point.id), signal, previous.pointId === point.id && previous.status === "error", active.id);
        resolutionStatus = 200;
      }
      if (!isActive()) return;
      lookupMs = performance.now() - lookupStarted;
      startupStarted = performance.now();
      const deadline = startupStarted + 30_000;
      for (; active.index < active.sources.length; active.index++) {
        if (!isActive()) return;
        const attempt = new AbortController();
        const attemptSignal = AbortSignal.any([signal, attempt.signal]);
        let starting = true;
        try {
          const audio = active.audio ?? new Audio();
          active.audio = audio;
          const url = validatePlayableAudio(active.sources[active.index], audio);
          if (audio.src !== url) { audio.preload = "none"; audio.src = url; }
          const markPlaying = () => {
            if (!isActive() || attemptSignal.aborted) return;
            update({ error: null, point, pointId: point.id, status: "playing" });
            if (!reportedPlaying) { report("playing", "startup"); reportedPlaying = true; }
            if (!active.recorded) { active.recorded = true; onStartRef.current?.(point); }
          };
          const options = { signal: attemptSignal };
          audio.addEventListener("playing", markPlaying, options);
          const buffering = () => {
            if (isActive() && !starting && !audio.paused) update({ error: null, point, pointId: point.id, status: "buffering" });
          };
          audio.addEventListener("waiting", buffering, options);
          audio.addEventListener("stalled", buffering, options);
          audio.addEventListener("pause", () => {
            if (isActive() && !starting && !audio.ended) update({ ...stateRef.current, status: "paused" });
          }, options);
          audio.addEventListener("ended", () => {
            if (!isActive()) return;
            active.controller.abort(); disposeAudio(audio); active.audio = null;
            update({ error: null, point, pointId: point.id, status: "stopped" });
          }, options);
          audio.addEventListener("error", () => { if (isActive() && !starting) fail(undefined, "playback"); }, options);
          const remaining = deadline - performance.now();
          if (remaining <= 0) throw new PlaybackError("timeout");
          await startAudio(audio, attemptSignal, remaining);
          if (!isActive()) return;
          starting = false;
          markPlaying();
          return;
        } catch (error) {
          attempt.abort();
          if (!isActive()) return;
          const reason = playbackFailure(error, active.audio);
          if (reason === "permission") {
            report(reason, "startup");
            update({ error: playbackFailureMessage(reason), point, pointId: point.id, status: "idle" });
            return;
          }
          if (reason === "timeout" || active.index + 1 === active.sources.length) throw error;
          report(reason, "startup");
          disposeAudio(active.audio); active.audio = null;
        }
      }
    } catch (error) {
      if (!isActive()) return;
      if (error instanceof PlaybackError && startupStarted === null) resolutionStatus = error.status;
      fail(error, startupStarted === null ? "resolution" : "startup");
    }
  }, [playback, cancel, replaceHistory, update]);

  const play = useCallback((point: TerraPoint) => playPoint(point), [playPoint]);
  const playPrevious = useCallback(async () => {
    const result = takePreviousPlaybackPoint(historyRef.current, stateRef.current.pointId);
    replaceHistory(result.history);
    if (result.point) await playPoint(result.point, false);
  }, [playPoint, replaceHistory]);
  const reportError = useCallback((message: string) => { cancel(); update({ ...stateRef.current, error: message, status: "error" }); }, [cancel, update]);
  useEffect(() => {
    if (!state.point || !["playing", "paused"].includes(state.status)) return;
    const point = state.point;
    let active = true;
    const check = async () => {
      try {
        const mode = findTerraMode(point.modeId);
        if (!mode) return;
        const response = await fetch(mode.detailEndpoint(point.id), { cache: "no-store" });
        if ([401,403,404,503].includes(response.status)) { if(active)stop(); return; }
        if(response.ok) { const detail = await response.json(); if(active && detail.availability?.status === "disabled")stop(); }
      } catch { /* ApplicationGate separately monitors application access. */ }
    };
    const timer = setInterval(() => void check(), 15000);
    return () => { active=false;clearInterval(timer); };
  }, [state.point, state.status, stop]);
  useEffect(() => { stop(); }, [playback, stop]);
  useEffect(() => cancel, [cancel]);
  return { ...state, canPlayPrevious: history.length > 0, pause, play, playPrevious, reportError, stop };
}

function disposeAudio(audio: HTMLAudioElement | null) {
  if (!audio) return;
  audio.pause(); audio.removeAttribute("src"); audio.load();
}
