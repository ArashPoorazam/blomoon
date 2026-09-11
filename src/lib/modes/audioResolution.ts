import type { TerraAudioSource } from "./types";
import { PlaybackError } from "./audioStartup";

export async function fetchAudioSources(endpoint: string, signal: AbortSignal, refresh: boolean, sessionId: string): Promise<TerraAudioSource[]> {
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
    const primary = parseSource(payload);
    if (!primary) throw new PlaybackError("lookup", status);
    const alternatives = payload && typeof payload === "object" && "alternatives" in payload ? payload.alternatives : [];
    if (!Array.isArray(alternatives) || alternatives.length > 1) throw new PlaybackError("lookup", status);
    const sources = [primary];
    for (const value of alternatives) {
      const source = parseSource(value);
      if (!source) throw new PlaybackError("lookup", status);
      if (!sources.some(existing => existing.streamUrl === source.streamUrl)) sources.push(source);
    }
    return sources;
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    if (timeout.aborted) throw new PlaybackError("resolution_timeout", status);
    if (error instanceof PlaybackError) throw error;
    throw new PlaybackError(status ? "lookup" : "network", status);
  }
}

function parseSource(value: unknown): TerraAudioSource | null {
  if (!value || typeof value !== "object" || !("streamUrl" in value) || typeof value.streamUrl !== "string") return null;
  try {
    const url = new URL(value.streamUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const format = "format" in value ? value.format : undefined;
    const contentType = "contentType" in value ? value.contentType : undefined;
    if (format !== undefined && format !== "audio" && format !== "hls") return null;
    if (contentType !== undefined && typeof contentType !== "string") return null;
    return { streamUrl: url.href, format, contentType };
  } catch { return null; }
}
