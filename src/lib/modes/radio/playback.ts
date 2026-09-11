import "server-only";
import { z } from "zod";
import { abortable } from "@/lib/abort";
import { logger } from "@/lib/server/logging";
import { RADIO_FIXTURE_RECORDS } from "../fixtures/radio";
import type { TerraPlayableAudio } from "../types";
import { STREAM_CACHE_TTL_MS } from "./config";
import { radioPlaybackIds } from "./identityStore";
import { fetchRadioBrowserJsonWithOptions } from "./provider";
import { playbackStationSchema, radioPlaybackSources } from "./playbackSources";

export type RadioResolutionCode = "invalid_input" | "not_found" | "provider_failure" | "resolution_timeout" | "no_source";
export class RadioResolutionError extends Error {
  constructor(public readonly code: RadioResolutionCode) { super(code); }
}
type Resolution = { stream: TerraPlayableAudio; providerId: string | null };
const cache = new Map<string, { expires: number; result: Resolution }>();

export async function getRadioPlayableStream(id: string, refresh = false, requestSignal?: AbortSignal): Promise<Resolution> {
  const signal = AbortSignal.any([AbortSignal.timeout(8_000), ...(requestSignal ? [requestSignal] : [])]);
  const started = performance.now();
  const fixture = RADIO_FIXTURE_RECORDS.find(record => record.point.id === id);
  if (!fixture && !z.uuid().safeParse(id).success) throw new RadioResolutionError("invalid_input");
  signal.throwIfAborted();
  const cached = cache.get(id);
  if (!refresh && cached && cached.expires > Date.now()) return cached.result;
  cache.delete(id);
  try {
    const ids = fixture ? [] : await radioPlaybackIds(id, signal);
    let station: z.infer<typeof playbackStationSchema> | null = fixture ? { stationuuid: id, url: fixture.streamUrl } : null;
    let providerId: string | null = null;
    for (const candidateId of ids) {
      signal.throwIfAborted();
      let payload: unknown;
      try {
        payload = await abortable(fetchRadioBrowserJsonWithOptions<unknown>(
          `/json/stations/byuuid/${encodeURIComponent(candidateId)}`, undefined,
          { cache: "no-store", timeoutMs: 3_000, signal }
        ), signal);
      } catch (error) {
        if (signal.aborted) throw error;
        throw new RadioResolutionError("provider_failure");
      }
      const parsed = z.array(playbackStationSchema).max(1).safeParse(payload);
      if (!parsed.success || (parsed.data[0] && parsed.data[0].stationuuid !== candidateId)) {
        throw new RadioResolutionError("provider_failure");
      }
      if (parsed.data[0]) { station = parsed.data[0]; providerId = candidateId; break; }
    }
    signal.throwIfAborted();
    if (!station) throw new RadioResolutionError("not_found");
    const { sources, cacheable } = radioPlaybackSources(station);
    const [primary, ...alternatives] = sources;
    if (!primary) throw new RadioResolutionError("no_source");
    const result: Resolution = { providerId, stream: {
      ...primary, alternatives, checkedAt: new Date().toISOString(), mediaKind: "audio", pointId: id
    } };
    if (cacheable) {
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      cache.set(id, { expires: Date.now() + STREAM_CACHE_TTL_MS, result });
    }
    logger.info("radio.playback.resolved", { context: { pointId: id, providerId, cacheable, sourceCount: sources.length,
      host: new URL(primary.streamUrl).host }, durationMs: Math.round(performance.now() - started), message: "Radio playback addresses resolved" });
    return result;
  } catch (error) {
    if (requestSignal?.aborted) throw requestSignal.reason;
    if (signal.aborted) throw new RadioResolutionError("resolution_timeout");
    throw error;
  }
}

/** Provider popularity accounting cannot delay or change a playback response. */
export async function recordRadioPlaybackClick(providerId: string) {
  try {
    await fetchRadioBrowserJsonWithOptions<unknown>(`/json/url/${encodeURIComponent(providerId)}`, undefined,
      { cache: "no-store", timeoutMs: 2_000, signal: AbortSignal.timeout(2_000) });
  } catch {
    logger.warn("radio.playback.click_failed", { context: { providerId }, message: "Radio popularity update failed" });
  }
}
