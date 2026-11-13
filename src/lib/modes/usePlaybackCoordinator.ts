"use client";
import { usePlaybackPolicy } from "./playback/usePlaybackPolicy";

import { useCallback, useEffect, useRef, useState } from "react";
import { appendPlaybackHistory, takePreviousPlaybackPoint } from "./playbackNavigation";
import type { TerraPlaybackConfig, TerraPoint } from "./types";
import { PlaybackError, playbackFailure, playbackFailureMessage } from "./playback/errors";
import { NO_CONTROLS, type PlaybackControls, type PlaybackDescriptor } from "./playback/descriptor";
import type { PlaybackEngine, PlaybackEngineFactory } from "./playback/engine";
import { createPlaybackEngine } from "./playback/audioEngine";
import { scheduleExpiry } from "./playback/expiry";
import { resolvePlayback } from "./playback/resolution";
import { reportPlaybackDiagnostic } from "./playbackDiagnostics";

export type PlaybackStatus = "idle" | "loading" | "playing" | "buffering" | "paused" | "stopped" | "error";
export type PlaybackState = { error: string | null; point: TerraPoint | null; pointId: string | null; status: PlaybackStatus; controls: PlaybackControls };
export type PlaybackController = PlaybackState & {
  resume: () => Promise<void>; seek: (seconds: number) => boolean; setRate: (rate: number) => boolean;
  canPlayPrevious: boolean; pause: () => void; play: (point: TerraPoint) => Promise<void>;
  playPrevious: () => Promise<void>; reportError: (message: string) => void; stop: () => void;
};
type Session = {
  id: string; point: TerraPoint; controller: AbortController; engine: PlaybackEngine | null;
  descriptor: PlaybackDescriptor | null; clearExpiry: () => void; index: number; recorded: boolean;
};
const empty: PlaybackState = { error: null, point: null, pointId: null, status: "idle", controls: NO_CONTROLS };

export function usePlaybackCoordinator(playback: TerraPlaybackConfig | null, onPlaybackStart?: (point: TerraPoint) => void, engineFactory: PlaybackEngineFactory = createPlaybackEngine): PlaybackController {
  const sessionRef = useRef<Session | null>(null);
  const historyRef = useRef<TerraPoint[]>([]);
  const stateRef = useRef<PlaybackState>(empty);
  const onStartRef = useRef(onPlaybackStart);
  const [state, setState] = useState(empty);
  const [history, setHistory] = useState<TerraPoint[]>([]);
  useEffect(() => { onStartRef.current = onPlaybackStart; }, [onPlaybackStart]);
  const update = useCallback((next: PlaybackState) => { stateRef.current = next; setState(next); }, []);
  const replaceHistory = useCallback((next: TerraPoint[]) => { historyRef.current = next; setHistory(next); }, []);
  const cancel = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) { session.controller.abort(); session.clearExpiry(); session.engine?.dispose(); }
  }, []);
  const stop = useCallback(() => { cancel(); replaceHistory([]); update(empty); }, [cancel, replaceHistory, update]);
  const pause = useCallback(() => {
    const session = sessionRef.current;
    if (!session || !["loading", "playing", "buffering"].includes(stateRef.current.status) ||
        (session.descriptor && !session.descriptor.controls.pause)) return;
    // Pause can cancel startup as well as an established connection.
    session.controller.abort();
    session.engine?.pause();
    update({ ...stateRef.current, status: "paused" });
  }, [update]);

  const playPoint = useCallback(async (point: TerraPoint, recordHistory = true) => {
    if (!playback || point.kind === "show" || point.modeId !== playback.modeId) return;
    const previous = stateRef.current;
    let session = sessionRef.current;
    if ((session?.point.id === point.id && session.point.modeId === point.modeId) && ["playing", "buffering", "loading"].includes(previous.status)) return;
    const resume = (session?.point.id === point.id && session.point.modeId === point.modeId) && ["paused", "idle"].includes(previous.status);
    if (!resume || !session) {
      if (recordHistory) replaceHistory(appendPlaybackHistory(historyRef.current, previous.point, point));
      cancel();
      session = { id: crypto.randomUUID(), point, controller: new AbortController(), engine: null, descriptor: null, clearExpiry: () => {}, index: 0, recorded: false };
      sessionRef.current = session;
    } else {
      session.controller.abort();
      session.controller = new AbortController();
    }
    const active = session;
    const signal = active.controller.signal;
    const isActive = () => sessionRef.current === active && !signal.aborted;
    update({ error: null, point, pointId: point.id, status: "loading", controls: active.descriptor?.controls ?? NO_CONTROLS });
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
        ...(active.engine?.snapshot() ?? { mediaErrorCode: 0, readyState: 0, networkState: 0 }) });
    };
    const fail = (error: unknown, stage: "resolution" | "startup" | "playback") => {
      const reason = playbackFailure(error, { error: { code: active.engine?.snapshot().mediaErrorCode ?? 0 } });
      report(reason, stage);
      active.controller.abort();
      active.clearExpiry();
      active.engine?.dispose(); active.engine = null;
      update({ error: playbackMessage(reason, point.modeId), point, pointId: point.id, status: "error", controls: NO_CONTROLS });
    };
    try {
      if (active.descriptor?.expiresAt && Date.parse(active.descriptor.expiresAt) <= Date.now()) {
        throw new PlaybackError("expired");
      }
      if (!active.descriptor) {
        const resolved = await resolvePlayback(playback, point, signal, previous.pointId === point.id && previous.status === "error", active.id);
        if (!isActive()) return;
        active.descriptor = resolved;
        active.clearExpiry = scheduleExpiry(resolved.expiresAt, () => {
          if (sessionRef.current === active) fail(new PlaybackError("expired"), "playback");
        });
        resolutionStatus = 200;
      }
      if (!isActive()) return;
      lookupMs = performance.now() - lookupStarted;
      startupStarted = performance.now();
      const deadline = startupStarted + 30_000;
      for (; active.index < active.descriptor.sources.length; active.index++) {
        if (!isActive()) return;
        const attempt = new AbortController();
        const attemptSignal = AbortSignal.any([signal, attempt.signal]);
        let starting = true;
        try {
          const engine = active.engine ?? engineFactory(active.descriptor, active.descriptor.sources[active.index]);
          active.engine = engine;
          const markPlaying = () => {
            if (!isActive() || attemptSignal.aborted) return;
            update({ error: null, point, pointId: point.id, status: "playing", controls: active.descriptor!.controls });
            if (!reportedPlaying) { report("playing", "startup"); reportedPlaying = true; }
            if (!active.recorded) { active.recorded = true; onStartRef.current?.(point); }
          };
          engine.subscribe(event => {
            if (!isActive() || attemptSignal.aborted) return;
            if (event === "playing") markPlaying();
            if (event === "buffering" && !starting) update({ ...stateRef.current, status: "buffering" });
            if (event === "paused" && !starting) update({ ...stateRef.current, status: "paused" });
            if (event === "ended") {
              active.controller.abort(); active.clearExpiry(); engine.dispose(); active.engine = null;
              update({ error: null, point, pointId: point.id, status: "stopped", controls: NO_CONTROLS });
            }
            if (event === "error" && !starting) fail(undefined, "playback");
          }, attemptSignal);
          const remaining = deadline - performance.now();
          if (remaining <= 0) throw new PlaybackError("timeout");
          await engine.start(attemptSignal, remaining);
          if (!isActive()) return;
          starting = false;
          markPlaying();
          return;
        } catch (error) {
          attempt.abort();
          if (!isActive()) return;
          const reason = playbackFailure(error, { error: { code: active.engine?.snapshot().mediaErrorCode ?? 0 } });
          if (reason === "permission") {
            active.engine?.pause();
            report(reason, "startup");
            update({ error: playbackMessage(reason, point.modeId), point, pointId: point.id, status: "idle", controls: active.descriptor.controls });
            return;
          }
          if (reason === "timeout" || active.index + 1 === active.descriptor.sources.length) throw error;
          report(reason, "startup");
          active.engine?.dispose(); active.engine = null;
        }
      }
    } catch (error) {
      if (!isActive()) return;
      if (error instanceof PlaybackError && startupStarted === null) resolutionStatus = error.status;
      fail(error, startupStarted === null ? "resolution" : "startup");
    }
  }, [playback, cancel, replaceHistory, update, engineFactory]);

  const play = useCallback((point: TerraPoint) => playPoint(point), [playPoint]);
  const playPrevious = useCallback(async () => {
    const result = takePreviousPlaybackPoint(historyRef.current, stateRef.current.pointId);
    replaceHistory(result.history);
    if (result.point) await playPoint(result.point, false);
  }, [playPoint, replaceHistory]);
  const reportError = useCallback((message: string) => { cancel(); update({ ...stateRef.current, error: message, status: "error", controls: NO_CONTROLS }); }, [cancel, update]);
  const resume = useCallback(async () => {
    const current = stateRef.current;
    if (current.point && ["paused", "idle"].includes(current.status)) await playPoint(current.point);
  }, [playPoint]);
  const seek = useCallback((seconds: number) => {
    const session = sessionRef.current;
    return Boolean(session?.descriptor?.controls.seek && session.engine?.seek(seconds));
  }, []);
  const setRate = useCallback((rate: number) => {
    const session = sessionRef.current;
    return Boolean(session?.descriptor?.controls.rate && session.engine?.setRate(rate));
  }, []);
  usePlaybackPolicy(state.point, Boolean(state.point && !["error", "stopped"].includes(state.status)), stop);
  useEffect(() => { stop(); }, [playback, engineFactory, stop]);
  useEffect(() => cancel, [cancel]);
  return { ...state, canPlayPrevious: history.length > 0, pause, play, playPrevious, reportError, stop, resume, seek, setRate };
}

function playbackMessage(reason: Parameters<typeof playbackFailureMessage>[0], modeId: string) {
  const message = playbackFailureMessage(reason);
  return modeId === "radio" ? message : message.replaceAll("station", "item").replace("allow audio", "allow playback");
}
