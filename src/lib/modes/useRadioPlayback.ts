"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TerraPointDetail } from "./types";

export type RadioPlaybackStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type RadioPlaybackState = {
  error: string | null;
  stationId: string | null;
  status: RadioPlaybackStatus;
};

export type RadioPlaybackController = RadioPlaybackState & {
  pause: () => void;
  play: (station: TerraPointDetail) => Promise<void>;
  stop: () => void;
};

type PlayableStreamResponse = {
  streamUrl: string;
};

export function useRadioPlayback(activeStationId: string | null): RadioPlaybackController {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playRequestRef = useRef(0);
  const [state, setState] = useState<RadioPlaybackState>({
    error: null,
    stationId: null,
    status: "idle"
  });

  const stop = useCallback(() => {
    playRequestRef.current += 1;
    const audio = audioRef.current;

    disposeAudio(audio);

    audioRef.current = null;
    setState({
      error: null,
      stationId: null,
      status: "idle"
    });
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();
    setState((current) => ({
      ...current,
      status: "paused"
    }));
  }, []);

  const play = useCallback(async (station: TerraPointDetail) => {
    if (station.modeId !== "radio") {
      return;
    }

    const pausedAudio = audioRef.current;

    if (pausedAudio && state.stationId === station.id && state.status === "paused") {
      try {
        await pausedAudio.play();
        setState({
          error: null,
          stationId: station.id,
          status: "playing"
        });
      } catch {
        setState({
          error: "Playback was blocked. Press play again.",
          stationId: station.id,
          status: "error"
        });
      }
      return;
    }

    const requestId = playRequestRef.current + 1;
    playRequestRef.current = requestId;
    const currentAudio = audioRef.current;

    disposeAudio(currentAudio);
    audioRef.current = null;

    setState({
      error: null,
      stationId: station.id,
      status: "loading"
    });

    try {
      const response = await fetch(`/api/modes/radio/points/${encodeURIComponent(station.id)}/playable`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Station stream is not playable right now.");
      }

      const playable = (await response.json()) as PlayableStreamResponse;

      if (playRequestRef.current !== requestId) {
        return;
      }

      const audio = new Audio(playable.streamUrl);

      audio.preload = "none";
      audio.addEventListener("playing", () => {
        if (playRequestRef.current !== requestId) {
          return;
        }

        setState({
          error: null,
          stationId: station.id,
          status: "playing"
        });
      });
      audio.addEventListener("pause", () => {
        if (playRequestRef.current !== requestId) {
          return;
        }

        setState((current) => current.stationId === station.id && current.status === "playing"
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

        setState({
          error: "The station stream stopped or could not be decoded by this browser.",
          stationId: station.id,
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
      setState({
        error: error instanceof Error ? error.message : "Station stream is not playable right now.",
        stationId: station.id,
        status: "error"
      });
    }
  }, [state.stationId, state.status]);

  useEffect(() => {
    if (!activeStationId || (state.stationId && state.stationId !== activeStationId)) {
      stop();
    }
  }, [activeStationId, state.stationId, stop]);

  useEffect(() => () => {
    playRequestRef.current += 1;
    disposeAudio(audioRef.current);
    audioRef.current = null;
  }, []);

  return {
    ...state,
    pause,
    play,
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
