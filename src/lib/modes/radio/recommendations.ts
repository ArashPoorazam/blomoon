import "server-only";
import { discoveryEligibility, eligibleSnapshotPoints } from "./health/query";
import { createHash } from "node:crypto";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { listFavouritePoints } from "@/lib/persistence/favouriteFolders";
import { listPlaybackHistory } from "@/lib/playback-history/repository";
import type { TerraPointPage } from "../types";
import { activeRadioDirectory, directorySource } from "./directory";
import { rankRadioRecommendations, type RadioPreferenceSignal } from "./recommendationRanking";

const snapshots = schema.radioRecommendationSnapshots;
export class RecommendationPageExpired extends Error {}

export async function getRadioRecommendations(
  userId: string | null,
  limit: number,
  offset: number,
  pageToken?: string,
): Promise<TerraPointPage> {
  const ownerKey = userId ?? "guest";
  const generation = await activeRadioDirectory();
  if (pageToken) {
    const [snapshot] = await getDb()
      .select()
      .from(snapshots)
      .where(
        and(
          eq(snapshots.id, pageToken),
          eq(snapshots.ownerKey, ownerKey),
          gt(snapshots.expiresAt, new Date()),
        ),
      );
    if (!snapshot) throw new RecommendationPageExpired();
    return snapshotPage(snapshot, limit, offset);
  }
  const signals = await preferenceSignals(userId);
  const source = await directorySource(generation?.publishedAt);
  const profileKey = createHash("sha256")
    .update(JSON.stringify([generation?.id ?? "curated", new Date().toISOString().slice(0, 10), signals]))
    .digest("hex");
  return getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`radio-recommendations:${ownerKey}`}, 0))`,
    );
    const [existing] = await tx
      .select()
      .from(snapshots)
      .where(
        and(
          eq(snapshots.ownerKey, ownerKey),
          eq(snapshots.profileKey, profileKey),
          gt(snapshots.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (existing) return snapshotPage(existing, limit, offset);
    const rows = await tx
      .select({ record: schema.radioDirectory.record })
      .from(schema.radioDirectory)
      .where(discoveryEligibility(schema.radioDirectory.stationId));
    const ranked = rankRadioRecommendations(
      rows.map(({ record }) => record),
      signals,
    );
    const previous = await tx
      .select({ id: snapshots.id })
      .from(snapshots)
      .where(eq(snapshots.ownerKey, ownerKey))
      .orderBy(snapshots.expiresAt);
    const obsolete = previous.slice(0, Math.max(0, previous.length - 7)).map(({ id }) => id);
    if (obsolete.length) await tx.delete(snapshots).where(inArray(snapshots.id, obsolete));
    const [snapshot] = await tx
      .insert(snapshots)
      .values({
        ownerKey,
        userId,
        profileKey,
        ...ranked,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        source,
      })
      .returning();
    return snapshotPage(snapshot, limit, offset);
  });
}

async function preferenceSignals(userId: string | null): Promise<RadioPreferenceSignal[]> {
  if (!userId) return [];
  const [favourites, history] = await Promise.all([
    listFavouritePoints(userId),
    listPlaybackHistory(userId, "radio"),
  ]);
  const signals = new Map<string, RadioPreferenceSignal>();
  for (const point of favourites.points) {
    if (point.modeId === "radio") signals.set(point.id, { point, saved: true, playedAt: [] });
  }
  for (const item of history) {
    const signal = signals.get(item.point.id) ?? { point: item.point, saved: false, playedAt: [] };
    signal.playedAt.push(item.playedAt);
    signals.set(item.point.id, signal);
  }
  return [...signals.values()].sort((a, b) => a.point.id.localeCompare(b.point.id));
}

async function snapshotPage(
  snapshot: typeof snapshots.$inferSelect,
  limit: number,
  offset: number,
): Promise<TerraPointPage> {
  const [points, count] = await Promise.all([
    eligibleSnapshotPoints(snapshot.points),
    getDb()
      .select({ total: sql<number>`count(*)::int` })
      .from(schema.radioDirectory)
      .where(discoveryEligibility(schema.radioDirectory.stationId)),
  ]);
  return {
    modeId: "radio",
    catalogTotal: count[0].total,
    source: snapshot.source,
    points: points.slice(offset, offset + limit),
    limit,
    offset,
    total: points.length,
    totalKind: "exact",
    pageToken: snapshot.id,
    nextOffset: offset + limit < points.length ? offset + limit : null,
    recommendation: { kind: snapshot.personalized ? "personalized" : "discovery" },
  };
}
