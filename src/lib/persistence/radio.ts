import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getRadioStationPersistenceSnapshot } from "@/lib/modes/radio";
import { isRadioStationId } from "@/lib/modes/radio/api";
import type { RadioStationPersistenceSnapshot } from "@/lib/modes/radio/types";
import type { TerraPoint } from "@/lib/modes/types";
import type { FavouriteDto, ModePersistenceAdapter } from "./types";

export const radioPersistenceAdapter: ModePersistenceAdapter = {
  label: "Radio",
  modeId: "radio",
  async addFavourite(userId, pointId) {
    if (!isRadioStationId(pointId)) {
      return null;
    }

    const snapshot = await getRadioStationPersistenceSnapshot(pointId);

    if (!snapshot) {
      return null;
    }

    const db = getDb();

    return db.transaction(async (tx) => {
      await upsertStation(tx, snapshot);

      const [inserted] = await tx
        .insert(schema.usersFavourites)
        .values({
          userId,
          stationId: snapshot.id,
          updatedAt: new Date()
        })
        .onConflictDoNothing()
        .returning({
          createdAt: schema.usersFavourites.createdAt
        });

      if (inserted) {
        await tx
          .update(schema.stations)
          .set({
            starCount: sql`${schema.stations.starCount} + 1`,
            updatedAt: new Date()
          })
          .where(eq(schema.stations.id, snapshot.id));
      }

      return {
        modeId: "radio",
        pointId: snapshot.id,
        createdAt: (inserted?.createdAt ?? new Date()).toISOString(),
        point: stationSnapshotToPoint(snapshot)
      };
    });
  },
  async listFavourites(userId) {
    const rows = await getDb()
      .select({
        bitrate: schema.stations.bitrate,
        codec: schema.stations.codec,
        country: schema.stations.country,
        countryCode: schema.stations.countryCode,
        createdAt: schema.usersFavourites.createdAt,
        id: schema.stations.id,
        language: schema.stations.language,
        latitude: schema.stations.latitude,
        locationPrecision: schema.stations.locationPrecision,
        longitude: schema.stations.longitude,
        name: schema.stations.name,
        providerClicks: schema.stations.providerClicks,
        providerMetadata: schema.stations.providerMetadata,
        providerUpdatedAt: schema.stations.providerUpdatedAt,
        providerVotes: schema.stations.providerVotes,
        starCount: schema.stations.starCount,
        summary: schema.stations.summary,
        tags: schema.stations.tags
      })
      .from(schema.usersFavourites)
      .innerJoin(schema.stations, eq(schema.usersFavourites.stationId, schema.stations.id))
      .where(eq(schema.usersFavourites.userId, userId))
      .orderBy(desc(schema.usersFavourites.updatedAt));

    return rows.map((row) => ({
      modeId: "radio" as const,
      pointId: row.id,
      createdAt: row.createdAt.toISOString(),
      point: stationRowToPoint(row)
    }));
  },
  async removeFavourite(userId, pointId) {
    if (!isRadioStationId(pointId)) {
      return false;
    }

    const db = getDb();

    return db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(schema.usersFavourites)
        .where(and(
          eq(schema.usersFavourites.userId, userId),
          eq(schema.usersFavourites.stationId, pointId)
        ))
        .returning({ stationId: schema.usersFavourites.stationId });

      if (!deleted) {
        return false;
      }

      await tx
        .update(schema.stations)
        .set({
          starCount: sql`greatest(${schema.stations.starCount} - 1, 0)`,
          updatedAt: new Date()
        })
        .where(eq(schema.stations.id, deleted.stationId));

      return true;
    });
  },
  async recordClick(userId, pointId) {
    if (!isRadioStationId(pointId)) {
      return null;
    }

    const snapshot = await getRadioStationPersistenceSnapshot(pointId);

    if (!snapshot) {
      return null;
    }

    const db = getDb();

    return db.transaction(async (tx) => {
      await upsertStation(tx, snapshot);

      const [clickRow] = await tx
        .insert(schema.stationClicks)
        .values({
          userId,
          stationId: snapshot.id,
          clickCount: 1,
          lastClickedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [schema.stationClicks.userId, schema.stationClicks.stationId],
          set: {
            clickCount: sql`${schema.stationClicks.clickCount} + 1`,
            lastClickedAt: new Date()
          }
        })
        .returning({ clickCount: schema.stationClicks.clickCount });

      await tx
        .update(schema.stations)
        .set({
          clickCount: sql`${schema.stations.clickCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(schema.stations.id, snapshot.id));

      return { clickCount: clickRow?.clickCount ?? 1 };
    });
  }
};

async function upsertStation(tx: any, snapshot: RadioStationPersistenceSnapshot) {
  await tx
    .insert(schema.stations)
    .values({
      id: snapshot.id,
      providerStationId: snapshot.id,
      name: snapshot.name,
      summary: snapshot.summary,
      countryCode: snapshot.countryCode,
      country: snapshot.country,
      language: snapshot.language,
      tags: snapshot.tags,
      codec: snapshot.codec,
      bitrate: snapshot.bitrate,
      latitude: snapshot.latitude,
      longitude: snapshot.longitude,
      locationPrecision: snapshot.locationPrecision,
      streamUrl: snapshot.streamUrl,
      sourceUrl: snapshot.sourceUrl,
      providerVotes: snapshot.votes,
      providerClicks: snapshot.clickCount,
      providerMetadata: snapshot.metrics,
      providerUpdatedAt: snapshot.timestamp ? new Date(snapshot.timestamp) : null,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: schema.stations.id,
      set: {
        name: snapshot.name,
        summary: snapshot.summary,
        countryCode: snapshot.countryCode,
        country: snapshot.country,
        language: snapshot.language,
        tags: snapshot.tags,
        codec: snapshot.codec,
        bitrate: snapshot.bitrate,
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
        locationPrecision: snapshot.locationPrecision,
        streamUrl: snapshot.streamUrl,
        sourceUrl: snapshot.sourceUrl,
        providerVotes: snapshot.votes,
        providerClicks: snapshot.clickCount,
        providerMetadata: snapshot.metrics,
        providerUpdatedAt: snapshot.timestamp ? new Date(snapshot.timestamp) : null,
        updatedAt: new Date()
      }
    });
}

function stationSnapshotToPoint(snapshot: RadioStationPersistenceSnapshot): TerraPoint {
  return {
    id: snapshot.id,
    modeId: "radio",
    name: snapshot.name,
    latitude: snapshot.latitude,
    longitude: snapshot.longitude,
    locationPrecision: snapshot.locationPrecision,
    countryCode: snapshot.countryCode,
    prominence: normalizeProminence(snapshot.clickCount, snapshot.votes),
    timestamp: snapshot.timestamp ?? undefined,
    summary: snapshot.summary,
    metrics: snapshot.metrics
  };
}

function stationRowToPoint(row: {
  bitrate: number | null;
  codec: string | null;
  country: string;
  countryCode: string;
  id: string;
  language: string | null;
  latitude: number;
  locationPrecision: "station" | "country";
  longitude: number;
  name: string;
  providerClicks: number;
  providerMetadata: Record<string, string | number | null>;
  providerUpdatedAt: Date | null;
  providerVotes: number;
  starCount: number;
  summary: string;
  tags: string[];
}): TerraPoint {
  return {
    id: row.id,
    modeId: "radio",
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    locationPrecision: row.locationPrecision,
    countryCode: row.countryCode,
    prominence: normalizeProminence(row.providerClicks, row.providerVotes),
    timestamp: row.providerUpdatedAt?.toISOString(),
    summary: row.summary,
    metrics: {
      ...row.providerMetadata,
      Bitrate: row.bitrate ? `${row.bitrate} kbps` : "Unknown",
      Clicks: row.providerClicks,
      Codec: row.codec ?? "Unknown",
      Country: row.country,
      Favourites: row.starCount,
      Language: row.language ?? "Unknown",
      Tags: row.tags.join(", ") || "Untagged",
      Votes: row.providerVotes
    }
  };
}

function normalizeProminence(clickCount: number, votes: number) {
  const score = Math.log10(Math.max(0, clickCount) + Math.max(0, votes) * 5 + 1) / 5;
  return Math.min(1, Math.max(0.12, score));
}
