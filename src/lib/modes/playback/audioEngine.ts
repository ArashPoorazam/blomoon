import { startAudio, validatePlayableAudio } from "../audioStartup";
import { PlaybackError } from "./errors";
import type { PlaybackEngineFactory } from "./engine";

/** Native audio only. Native/adaptive video and embedded engines are P11 work. */
export const createPlaybackEngine: PlaybackEngineFactory = (descriptor, source) => {
  if (descriptor.mediaKind !== "audio" || source.transport === "embed") throw new PlaybackError("unsupported");
  const audio = new Audio();
  const dispose = () => { audio.pause(); audio.removeAttribute("src"); audio.load(); };
  try {
    audio.preload = "none";
    audio.src = validatePlayableAudio({ streamUrl: source.url, format: source.transport === "hls" ? "hls" : "audio", contentType: source.contentType }, audio);
  } catch (error) { dispose(); throw error; }
  return {
    start: (signal, timeoutMs) => startAudio(audio, signal, timeoutMs),
    subscribe(listener, signal) {
      const options = { signal };
      audio.addEventListener("playing", () => listener("playing"), options);
      for (const event of ["waiting", "stalled"]) audio.addEventListener(event, () => {
        if (!audio.paused) listener("buffering");
      }, options);
      audio.addEventListener("pause", () => { if (!audio.ended) listener("paused"); }, options);
      audio.addEventListener("ended", () => listener("ended"), options);
      audio.addEventListener("error", () => listener("error"), options);
    },
    pause: () => audio.pause(),
    seek(seconds) {
      if (!descriptor.controls.seek || !Number.isFinite(seconds) || seconds < 0) return false;
      for (let index = 0; index < audio.seekable.length; index++) {
        if (seconds >= audio.seekable.start(index) && seconds <= audio.seekable.end(index)) {
          try { audio.currentTime = seconds; return true; } catch { return false; }
        }
      }
      return false;
    },
    setRate(rate) {
      if (!descriptor.controls.rate || !Number.isFinite(rate) || rate < 0.5 || rate > 3) return false;
      try { audio.playbackRate = rate; return true; } catch { return false; }
    },
    snapshot: () => ({ mediaErrorCode: audio.error?.code ?? 0, readyState: audio.readyState, networkState: audio.networkState }),
    dispose,
  };
};
