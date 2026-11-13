import type { TerraAudioSource } from "./types";
import { PlaybackError } from "./playback/errors";

export function parseAudioSources(payload: unknown): TerraAudioSource[] {
  const primary = parseSource(payload);
  if (!primary) throw new PlaybackError("lookup", 200);
  const alternatives = payload && typeof payload === "object" && "alternatives" in payload ? payload.alternatives : [];
  if (!Array.isArray(alternatives) || alternatives.length > 1) throw new PlaybackError("lookup", 200);
  const sources = [primary];
  for (const value of alternatives) {
    const source = parseSource(value);
    if (!source) throw new PlaybackError("lookup", 200);
    if (!sources.some(existing => existing.streamUrl === source.streamUrl)) sources.push(source);
  }
  return sources;
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
