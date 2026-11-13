import { PlaybackError, playbackFailure } from "./playback/errors";
export { PlaybackError, playbackFailure, playbackFailureMessage } from "./playback/errors";

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
