export type PlaybackFailure = "lookup" | "timeout" | "network" | "unsupported" | "permission" | "unknown" | "not_found" | "provider_failure" | "resolution_timeout" | "no_source";

export class PlaybackError extends Error {
  constructor(public readonly reason: PlaybackFailure, public readonly status = 0) {
    super(reason);
  }
}

export function playbackFailure(error: unknown, audio?: HTMLAudioElement | null): PlaybackFailure {
  if (error instanceof PlaybackError) return error.reason;
  if (error && typeof error === "object" && "name" in error) {
    if (error.name === "NotAllowedError") return "permission";
    if (error.name === "NotSupportedError" || error.name === "AbortError") return "unknown";
  }
  if (audio?.error?.code === 2) return "network";
  if (audio?.error?.code === 3 || audio?.error?.code === 4) return "unknown";
  return "unknown";
}

// A media error must settle startup immediately, even when play() stays pending.
export function startAudio(audio: HTMLAudioElement, signal: AbortSignal, timeoutMs = 30_000): Promise<void> {
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
    const timeout = setTimeout(() => finish(new PlaybackError("timeout")), timeoutMs);
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
  const hls = ("format" in value && value.format === "hls") || ["application/vnd.apple.mpegurl", "application/x-mpegurl", "audio/mpegurl", "audio/x-mpegurl"].includes(contentType) || /\.m3u8$/i.test(url.pathname);
  if (contentType === "text/html" || (hls && !audio.canPlayType("application/vnd.apple.mpegurl") && !audio.canPlayType("application/x-mpegURL"))) {
    throw new PlaybackError("unsupported");
  }
  return url.href;
}

export function playbackFailureMessage(reason: PlaybackFailure): string {
  switch (reason) {
    case "not_found": return "This station is no longer available.";
    case "provider_failure": return "The station directory is unavailable. Try again.";
    case "resolution_timeout": return "Station lookup took too long. Try again.";
    case "no_source": return "This station has no eligible stream address.";
    case "lookup": return "Could not resolve this station. Try again.";
    case "timeout": return "This station took too long to start. Try again or choose another station.";
    case "network": return "The stream connection failed. Try again or choose another station.";
    case "unsupported": return "This stream format is not supported by your browser. Choose another station.";
    case "permission": return "Press play to allow audio in your browser.";
    default: return "This stream is unavailable. Try again or choose another station.";
  }
}
