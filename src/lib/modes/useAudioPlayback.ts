"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TerraPlaybackConfig, TerraPointDetail } from "./types";

export type AudioPlaybackStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type AudioPlaybackState = {
  error: string | null;
  point: TerraPointDetail | null;
  pointId: string | null;
  status: AudioPlaybackStatus;
};

export type AudioPlaybackController = AudioPlaybackState & {
  pause: () => void;
  play: (point: TerraPointDetail) => Promise<void>;
  stop: () => void;
};

type PlayableAudioResponse = {
  streamUrl: string;
};

export function useAudioPlayback(playback: TerraPlaybackConfig | null): AudioPlaybackController {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playRequestRef = useRef(0);
  const [state, setState] = useState<AudioPlaybackState>({
    error: null,
    point: null,
    pointId: null,
    status: "idle"
  });

  const stop = useCallback(() => {
    playRequestRef.current += 1;
    const audio = audioRef.current;

    disposeAudio(audio);

    audioRef.current = null;
    setState({
      error: null,
      point: null,
      pointId: null,
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

  const play = useCallback(async (point: TerraPointDetail) => {
    if (!playback) {
      return;
    }

    const existingAudio = audioRef.current;

    if (existingAudio && state.pointId === point.id && state.status === "paused") {
      try {
        await existingAudio.play();
        setState({
          error: null,
          point,
          pointId: point.id,
          status: "playing"
        });
      } catch {
        setState({
          error: "Playback was blocked. Press play again.",
          point,
          pointId: point.id,
          status: "error"
        });
      }
      return;
    }

    if (existingAudio && state.pointId === point.id && state.status === "playing") {
      return;
    }

    const requestId = playRequestRef.current + 1;
    playRequestRef.current = requestId;
    const currentAudio = audioRef.current;

    disposeAudio(currentAudio);
    audioRef.current = null;

    setState({
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

        setState({
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

        setState((current) => current.pointId === point.id && current.status === "playing"
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
      setState({
        error: error instanceof Error ? error.message : "This stream is not playable right now.",
        point,
        pointId: point.id,
        status: "error"
      });
    }
  }, [playback, state.pointId, state.status]);

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
