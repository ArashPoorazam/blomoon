export type PlaybackFailure = "lookup" | "timeout" | "network" | "unsupported" | "permission" | "unknown";

export class PlaybackError extends Error {
  constructor(public readonly reason: PlaybackFailure) {
    super(reason);
  }
}

export function playbackFailure(error: unknown, audio?: HTMLAudioElement | null): PlaybackFailure {
  if (error instanceof PlaybackError) return error.reason;
  if (error instanceof Error && error.name === "NotAllowedError") return "permission";
  if (error instanceof Error && error.name === "NotSupportedError") return "unsupported";
  if (error instanceof Error && error.name === "AbortError") return "unknown";
  if (audio?.error?.code === 2) return "network";
  if (audio?.error?.code === 3 || audio?.error?.code === 4) return "unsupported";
  return "unknown";
}

// A media error must settle startup immediately, even when play() stays pending.
export function startAudio(audio: HTMLAudioElement, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve();
    };
    const onPlaying = () => finish();
    const onError = () => finish(new PlaybackError(playbackFailure(undefined, audio)));
    const onAbort = () => finish(new DOMException("Playback cancelled", "AbortError"));
    const timeout = setTimeout(() => finish(new PlaybackError("timeout")), 30_000);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) return onAbort();
    try {
      void audio.play().then(() => finish(), finish);
    } catch (error) {
      finish(error);
    }
  });
}

export function validatePlayableAudio(value: unknown, audio: HTMLAudioElement): string {
  if (!value || typeof value !== "object" || !("streamUrl" in value) || typeof value.streamUrl !== "string") {
    throw new PlaybackError("lookup");
  }
  let url: URL;
  try { url = new URL(value.streamUrl); } catch { throw new PlaybackError("lookup"); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new PlaybackError("lookup");
  const contentType = "contentType" in value && typeof value.contentType === "string" ? value.contentType.split(";")[0].trim().toLowerCase() : "";
  const hls = ["application/vnd.apple.mpegurl", "application/x-mpegurl", "audio/mpegurl", "audio/x-mpegurl"].includes(contentType) || /\.m3u8$/i.test(url.pathname);
  if (contentType === "text/html" || (hls && !audio.canPlayType("application/vnd.apple.mpegurl") && !audio.canPlayType("application/x-mpegURL"))) {
    throw new PlaybackError("unsupported");
  }
  return url.href;
}

export function playbackFailureMessage(reason: PlaybackFailure): string {
  switch (reason) {
    case "lookup": return "Could not resolve this station. Try again.";
    case "timeout": return "This station took too long to start. Try again or choose another station.";
    case "network": return "The stream connection failed. Try again or choose another station.";
    case "unsupported": return "This stream format is not supported by your browser. Choose another station.";
    case "permission": return "Press play to allow audio in your browser.";
    default: return "This stream is unavailable. Try again or choose another station.";
  }
}
