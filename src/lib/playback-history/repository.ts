import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { TerraModeId } from "@/lib/modes/types";
import { getPointRefKey } from "@/lib/modes/pointKeys";
import { hydratePersistedPoints } from "@/lib/persistence/points";
import { getModePersistenceAdapter } from "@/lib/persistence/registry";
import type { PlaybackHistoryItemDto } from "@/lib/persistence/types";
import { logger } from "@/lib/server/logging";
import { deriveLocalPlayedOn, PLAYBACK_HISTORY_LIMIT } from "./history";

export async function listPlaybackHistory(userId: string, modeId: TerraModeId): Promise<PlaybackHistoryItemDto[]> {
  const rows = await logger.measure("persistence.playback_history.list", { modeId, userId }, () => getDb()
    .select({
      modeId: schema.mediaItems.modeId,
      playedAt: schema.userPlaybackHistory.lastPlayedAt,
      playedOn: schema.userPlaybackHistory.playedOn,
      pointId: schema.userPlaybackHistory.mediaItemId
    })
    .from(schema.userPlaybackHistory)
    .innerJoin(schema.mediaItems, eq(schema.mediaItems.id, schema.userPlaybackHistory.mediaItemId))
    .where(and(eq(schema.userPlaybackHistory.userId, userId), eq(schema.mediaItems.modeId, modeId)))
    .orderBy(desc(schema.userPlaybackHistory.lastPlayedAt))
    .limit(PLAYBACK_HISTORY_LIMIT));
  const points = await hydratePersistedPoints(rows);

  return rows.flatMap((row) => {
    const point = points.get(getPointRefKey(row));
    return point ? [{ playedAt: row.playedAt.toISOString(), playedOn: row.playedOn, point }] : [];
  });
}

export async function recordPlaybackStart({ modeId, pointId, timezoneOffsetMinutes, userId, now = new Date() }: {
  modeId: TerraModeId;
  now?: Date;
  pointId: string;
  timezoneOffsetMinutes: number;
  userId: string;
}): Promise<PlaybackHistoryItemDto | null> {
  const adapter = getModePersistenceAdapter(modeId);
  const point = await adapter?.upsertPoint(pointId);
  if (!point) return null;

  const playedOn = deriveLocalPlayedOn(now, timezoneOffsetMinutes);
  const [row] = await logger.measure("persistence.playback_history.upsert", { modeId, pointId, userId }, () => getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:${modeId}`}, 0))`);
    const [upserted] = await tx.insert(schema.userPlaybackHistory).values({
      lastPlayedAt: now,
      mediaItemId: pointId,
      playedOn,
      userId
    }).onConflictDoUpdate({
      target: [schema.userPlaybackHistory.userId, schema.userPlaybackHistory.mediaItemId, schema.userPlaybackHistory.playedOn],
      set: { lastPlayedAt: now }
    }).returning({
      playedAt: schema.userPlaybackHistory.lastPlayedAt,
      playedOn: schema.userPlaybackHistory.playedOn
    });

    await tx.execute(sql`
      delete from ${schema.userPlaybackHistory} history
      using ${schema.mediaItems} item
      where history.media_item_id = item.id
        and history.user_id = ${userId}
        and item.mode_id = ${modeId}
        and (history.media_item_id, history.played_on) not in (
          select recent.media_item_id, recent.played_on
          from ${schema.userPlaybackHistory} recent
          inner join ${schema.mediaItems} recent_item on recent_item.id = recent.media_item_id
          where recent.user_id = ${userId} and recent_item.mode_id = ${modeId}
          order by recent.last_played_at desc
          limit ${PLAYBACK_HISTORY_LIMIT}
        )
    `);
    return [upserted];
  }));

  return row ? { playedAt: row.playedAt.toISOString(), playedOn: row.playedOn, point } : null;
}
