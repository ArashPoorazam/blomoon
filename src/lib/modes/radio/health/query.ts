import "server-only";
import { getModeSettings, unblockedPredicate } from "@/lib/admin/settings";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { TerraAvailability, TerraPoint } from "../../types";
import { healthFilteringEnabled, isRecentlyVerified } from "./policy";

export function verifiedSourcePredicate() {
  return sql`enabled and last_success > now() - interval '24 hours' and failures < 3`;
}
export function verifiedStationPredicate(stationId: SQL | typeof schema.radioDirectory.stationId) {
  return sql`exists (select 1 from radio_stream_sources where station_id=${stationId} and ${verifiedSourcePredicate()})`;
}
/** The only discovery eligibility policy, including the explicit observation rollout. */
export function discoveryEligibility(stationId: SQL | typeof schema.radioDirectory.stationId) {
  return sql`${unblockedPredicate("radio", stationId)} and (
    coalesce((select value->>'policy' from admin_settings where id='mode:radio'), ${healthFilteringEnabled() ? "enforce" : "observe"})='observe'
    or ${verifiedStationPredicate(stationId)})`;
}
export async function eligibleSnapshotPoints(points: TerraPoint[]) {
  if (!points.length) return [];
  const rows = await getDb()
    .select({ id: schema.radioDirectory.stationId })
    .from(schema.radioDirectory)
    .where(
      and(
        inArray(
          schema.radioDirectory.stationId,
          points.map((p) => p.id),
        ),
        discoveryEligibility(schema.radioDirectory.stationId),
      ),
    );
  const ids = new Set(rows.map((r) => r.id));
  return points.filter((p) => ids.has(p.id));
}
export async function stationAvailability(id: string): Promise<TerraAvailability> {
  return (await availabilityForStations([id])).get(id)!;
}

export async function availabilityForStations(ids: string[]) {
  if (!ids.length) return new Map<string, TerraAvailability>();
  const [sources, curated, blocks, modeSettings] = await Promise.all([
    getDb().select().from(schema.radioStreamSources).where(inArray(schema.radioStreamSources.stationId, ids)),
    getDb()
      .select()
      .from(schema.radioCuratedStations)
      .where(inArray(schema.radioCuratedStations.stationId, ids)),
    getDb().select().from(schema.mediaBlocks).where(and(eq(schema.mediaBlocks.modeId, "radio"), inArray(schema.mediaBlocks.pointId, ids))),
    getModeSettings("radio"),
  ]);
  const disabled = new Set(curated.filter((c) => !c.enabled).map((c) => c.stationId));
  blocks.forEach(b => disabled.add(b.pointId));
  if (!modeSettings.enabled) ids.forEach(id => disabled.add(id));
  const grouped = new Map<string, typeof sources>();
  for (const source of sources) {
    const group = grouped.get(source.stationId) ?? [];
    group.push(source);
    grouped.set(source.stationId, group);
  }
  return new Map(
    ids.map((id) => {
      const streams = grouped.get(id) ?? [];
      const success = streams.flatMap((s) => (s.lastSuccess ? [s.lastSuccess.getTime()] : []));
      const status: TerraAvailability["status"] = disabled.has(id)
        ? "disabled"
        : streams.some((s) => isRecentlyVerified(s))
          ? "available"
          : streams.some((s) => s.lastAttempt)
            ? "unavailable"
            : "unverified";
      return [
        id,
        { status, lastVerifiedAt: success.length ? new Date(Math.max(...success)).toISOString() : null },
      ];
    }),
  );
}
