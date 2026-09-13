import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { abortable } from "@/lib/abort";
import { logger } from "@/lib/server/logging";
import type { TerraPlayableAudio } from "../types";
import { getRadioStationRecord } from "./catalog";
import { fetchRadioBrowserJsonWithOptions } from "./provider";
import { healthFilteringEnabled, isRecentlyVerified } from "./health/policy";
import { markSourcesPlayed, requestStationRecheck } from "./health/sources";

export type RadioResolutionCode =
  | "invalid_input"
  | "not_found"
  | "provider_failure"
  | "resolution_timeout"
  | "no_source";
export class RadioResolutionError extends Error {
  constructor(public readonly code: RadioResolutionCode) {
    super(code);
  }
}
type Resolution = { stream: TerraPlayableAudio; providerId: string | null };
export async function getRadioPlayableStream(
  id: string,
  refresh = false,
  requestSignal?: AbortSignal,
): Promise<Resolution> {
  if (!z.uuid().safeParse(id).success) throw new RadioResolutionError("invalid_input");
  const signal = AbortSignal.any([AbortSignal.timeout(8000), ...(requestSignal ? [requestSignal] : [])]);
  try {
    signal.throwIfAborted();
    return await abortable(resolveStoredStream(id, refresh), signal);
  } catch (error) {
    if (requestSignal?.aborted) throw requestSignal.reason;
    if (signal.aborted) throw new RadioResolutionError("resolution_timeout");
    throw error;
  }
}
async function resolveStoredStream(id: string, refresh: boolean): Promise<Resolution> {
  const record = await getRadioStationRecord(id);
  if (!record) throw new RadioResolutionError("not_found");
  const stationId = record.point.id;
  const [curated] = await getDb()
    .select()
    .from(schema.radioCuratedStations)
    .where(eq(schema.radioCuratedStations.stationId, stationId));
  if (curated?.enabled === false) throw new RadioResolutionError("no_source");
  if (refresh) await requestStationRecheck(stationId);
  const sources = (
    await getDb()
      .select()
      .from(schema.radioStreamSources)
      .where(
        and(eq(schema.radioStreamSources.stationId, stationId), eq(schema.radioStreamSources.enabled, true)),
      )
      .orderBy(desc(schema.radioStreamSources.lastSuccess))
  ).filter((s) => !healthFilteringEnabled() || isRecentlyVerified(s)).slice(0, 2);
  const [primary, ...others] = sources;
  if (!primary) throw new RadioResolutionError("no_source");
  await markSourcesPlayed([primary.id]);
  return {
    providerId: primary.providerId,
    stream: {
      streamUrl: primary.streamUrl,
      format: "audio",
      mediaKind: "audio",
      checkedAt: (primary.lastSuccess ?? new Date()).toISOString(),
      pointId: stationId,
      alternatives: others.map((s) => ({ streamUrl: s.streamUrl, format: "audio" })),
    },
  };
}

/** Provider popularity accounting cannot delay or change a playback response. */
export async function recordRadioPlaybackClick(providerId: string) {
  try {
    await fetchRadioBrowserJsonWithOptions<unknown>(
      `/json/url/${encodeURIComponent(providerId)}`,
      undefined,
      { cache: "no-store", timeoutMs: 2_000, signal: AbortSignal.timeout(2_000) },
    );
  } catch {
    logger.warn("radio.playback.click_failed", {
      context: { providerId },
      message: "Radio popularity update failed",
    });
  }
}
