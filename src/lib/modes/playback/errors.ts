export type PlaybackFailure = "lookup" | "timeout" | "network" | "unsupported" | "permission" | "unknown" | "not_found" | "provider_failure" | "resolution_timeout" | "no_source" | "invalid_descriptor" | "expired" | "policy";

export class PlaybackError extends Error {
  constructor(public readonly reason: PlaybackFailure, public readonly status = 0) {
    super(reason);
  }
}

export function playbackFailure(error: unknown, audio?: { error?: { code: number } | null } | null): PlaybackFailure {
  if (error instanceof PlaybackError) return error.reason;
  if (error && typeof error === "object" && "name" in error) {
    if (error.name === "NotAllowedError") return "permission";
    if (error.name === "NotSupportedError" || error.name === "AbortError") return "unknown";
  }
  if (audio?.error?.code === 2) return "network";
  if (audio?.error?.code === 3 || audio?.error?.code === 4) return "unknown";
  return "unknown";
}

export function playbackFailureMessage(reason: PlaybackFailure): string {
  switch (reason) {
    case "invalid_descriptor": return "The playback response is invalid. Try again.";
    case "expired": return "This playback source has expired. Press play to refresh it.";
    case "policy": return "This item is no longer available for playback.";
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
