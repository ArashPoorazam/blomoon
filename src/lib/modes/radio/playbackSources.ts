import "server-only";
import { isIP } from "node:net";
import { z } from "zod";
import type { TerraAudioSource } from "../types";

export const playbackStationSchema = z.object({
  stationuuid: z.uuid(),
  url: z.string().max(10_000).nullish(),
  url_resolved: z.string().max(10_000).nullish(),
  hls: z.union([z.literal(0), z.literal(1)]).optional()
});

/** Address eligibility only. No server network probe can certify browser playback. */
export function browserStreamUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
    if (isIP(host) === 4) {
      const [a, b] = host.split(".").map(Number);
      if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254)
        || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
        || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19))) return null;
    } else if (isIP(host) === 6) {
      // Only global unicast; excludes loopback, mapped IPv4, link-local and ULA.
      if (!/^[23][0-9a-f]{3}:/.test(host)) return null;
    } else if (!host.includes(".") || /(?:^|\.)(?:localhost|local|internal|home|lan)$/.test(host)) return null;
    url.protocol = "https:";
    url.hash = "";
    return url.href;
  } catch { return null; }
}

export function radioPlaybackSources(station: z.infer<typeof playbackStationSchema>) {
  const playlist = /\.(?:pls|m3u|asx)(?:$|[?#])/i.test(station.url ?? "");
  const candidates = [
    { raw: station.url, original: true },
    { raw: station.url_resolved, original: false }
  ].filter(candidate => !playlist || !candidate.original);
  candidates.sort((a, b) => Number(b.raw?.startsWith("https:")) - Number(a.raw?.startsWith("https:")));
  const sources: TerraAudioSource[] = [];
  let cacheable = true;
  for (const candidate of candidates) {
    const streamUrl = browserStreamUrl(candidate.raw);
    if (!streamUrl || sources.some(source => source.streamUrl === streamUrl)) continue;
    sources.push({ streamUrl, format: station.hls === 1 || /\.m3u8$/i.test(new URL(streamUrl).pathname) ? "hls" : "audio" });
    cacheable &&= candidate.original && !new URL(streamUrl).search;
  }
  return { sources, cacheable };
}
