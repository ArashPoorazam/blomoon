import { parseAudioSources } from "../audioResolution";
import type { TerraPlaybackConfig, TerraPoint } from "../types";
import { validatePlaybackDescriptor } from "./descriptor";
import { PlaybackError } from "./errors";

export async function resolvePlayback(config: TerraPlaybackConfig, point: TerraPoint, signal: AbortSignal, refresh: boolean, sessionId: string) {
  const payload = await fetchPlayablePayload(config.playableEndpoint(point.id), signal, refresh, sessionId);
  if (config.responseKind === "descriptor") return validatePlaybackDescriptor(payload, point, config);
  // Keep the radio API wire format and its bounded alternative/source rules compatible.
  if (config.modeId !== "radio" || config.mediaKind !== "audio" || config.responseKind !== "radio-audio") {
    throw new PlaybackError("invalid_descriptor");
  }
  // A saved legacy radio alias may resolve to a different canonical station ID.
  // The server resolves that alias and enforces policy; retain the requested UI identity.
  if (payload && typeof payload === "object" && "mediaKind" in payload && payload.mediaKind !== "audio") {
    throw new PlaybackError("invalid_descriptor");
  }
  return validatePlaybackDescriptor({
    version: 1, modeId: point.modeId, pointId: point.id, mediaKind: "audio", timeline: "live",
    expiresAt: null, controls: { pause: true, seek: false, rate: false },
    sources: parseAudioSources(payload).map(item => ({
      url: item.streamUrl, transport: item.format === "hls" ? "hls" : "direct", contentType: item.contentType,
    })),
  }, point, config);
}

export async function fetchPlayablePayload(endpoint: string, signal: AbortSignal, refresh: boolean, sessionId: string): Promise<unknown> {
  const timeout = AbortSignal.timeout(10_000);
  const combined = AbortSignal.any([signal, timeout]);
  let status = 0;
  try {
    const url = new URL(endpoint, window.location.href);
    if (refresh) url.searchParams.set("refresh", "true");
    const response = await fetch(url, { method: "POST", signal: combined, headers: { "x-request-id": sessionId } });
    status = response.status;
    const payload: unknown = await response.json();
    combined.throwIfAborted();
    if (!response.ok) {
      const code = payload && typeof payload === "object" && "code" in payload ? payload.code : null;
      if (code === "not_found" || code === "provider_failure" || code === "resolution_timeout" || code === "no_source") {
        throw new PlaybackError(code, status);
      }
      throw new PlaybackError("lookup", status);
    }
    return payload;
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    if (timeout.aborted) throw new PlaybackError("resolution_timeout", status);
    if (error instanceof PlaybackError) throw error;
    throw new PlaybackError(status ? "lookup" : "network", status);
  }
}

