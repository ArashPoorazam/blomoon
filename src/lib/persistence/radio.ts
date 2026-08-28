import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema, type BlomoonDb } from "@/db";
import { getRadioStationPersistenceSnapshot } from "@/lib/modes/radio";
import { isRadioStationId } from "@/lib/modes/radio/api";
import type { RadioStationPersistenceSnapshot } from "@/lib/modes/radio/types";
import type { TerraPoint } from "@/lib/modes/types";
import { logger } from "@/lib/server/logging";
import type { FavouriteDto, ModePersistenceAdapter } from "./types";

type BlomoonTransaction = Parameters<Parameters<BlomoonDb["transaction"]>[0]>[0];

const RADIO_MODE_ID = "radio";
const RADIO_BROWSER_PROVIDER_ID = "radio-browser";
const RADIO_BROWSER_PROVIDER_NAME = "Radio Browser";
const RADIO_BROWSER_PROVIDER_URL = "https://www.radio-browser.info";
const RADIO_BROWSER_ATTRIBUTION = "Radio Browser community database";

export const radioPersistenceAdapter: ModePersistenceAdapter = {
  label: "Radio",
  modeId: RADIO_MODE_ID,
  async addFavourite(userId, pointId) {
    return logger.measure("persistence.radio.favourite.add", {
      pointId,
      userId
    }, async () => {
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
          .insert(schema.userFavourites)
          .values({
            userId,
            mediaItemId: snapshot.id,
            updatedAt: new Date()
          })
          .onConflictDoNothing()
          .returning({
            createdAt: schema.userFavourites.createdAt
          });

        if (inserted) {
          await tx
            .update(schema.mediaItems)
            .set({
              starCount: sql`${schema.mediaItems.starCount} + 1`,
              updatedAt: new Date()
            })
            .where(eq(schema.mediaItems.id, snapshot.id));
        }

        return {
          modeId: RADIO_MODE_ID,
          pointId: snapshot.id,
          createdAt: (inserted?.createdAt ?? new Date()).toISOString(),
          point: stationSnapshotToPoint(snapshot)
        };
      });
    });
  },
  async listFavourites(userId) {
    const rows = await logger.measure("persistence.radio.favourites.list", {
      userId
    }, () => getDb()
        .select({
          bitrate: schema.radioStations.bitrate,
          codec: schema.radioStations.codec,
          country: schema.mediaItems.country,
          countryCode: schema.mediaItems.countryCode,
          createdAt: schema.userFavourites.createdAt,
          id: schema.mediaItems.id,
          language: schema.radioStations.language,
          latitude: schema.mediaItems.latitude,
          locationPrecision: schema.mediaItems.locationPrecision,
          longitude: schema.mediaItems.longitude,
          name: schema.mediaItems.name,
          providerClicks: schema.radioStations.providerClicks,
          providerMetadata: schema.mediaItems.providerMetadata,
          providerUpdatedAt: schema.mediaItems.providerUpdatedAt,
          providerVotes: schema.radioStations.providerVotes,
          starCount: schema.mediaItems.starCount,
          summary: schema.mediaItems.summary,
          tags: schema.radioStations.tags
        })
        .from(schema.userFavourites)
        .innerJoin(schema.mediaItems, eq(schema.userFavourites.mediaItemId, schema.mediaItems.id))
        .innerJoin(schema.radioStations, eq(schema.radioStations.mediaItemId, schema.mediaItems.id))
        .where(and(
          eq(schema.userFavourites.userId, userId),
          eq(schema.mediaItems.modeId, RADIO_MODE_ID)
        ))
        .orderBy(desc(schema.userFavourites.updatedAt)));

    return rows.map((row) => ({
      modeId: RADIO_MODE_ID,
      pointId: row.id,
      createdAt: row.createdAt.toISOString(),
      point: stationRowToPoint(row)
    }));
  },
  async removeFavourite(userId, pointId) {
    return logger.measure("persistence.radio.favourite.remove", {
      pointId,
      userId
    }, async () => {
      if (!isRadioStationId(pointId)) {
        return false;
      }

      const db = getDb();

      return db.transaction(async (tx) => {
        const [deleted] = await tx
          .delete(schema.userFavourites)
          .where(and(
            eq(schema.userFavourites.userId, userId),
            eq(schema.userFavourites.mediaItemId, pointId)
          ))
          .returning({ mediaItemId: schema.userFavourites.mediaItemId });

        if (!deleted) {
          return false;
        }

        await tx
          .update(schema.mediaItems)
          .set({
            starCount: sql`greatest(${schema.mediaItems.starCount} - 1, 0)`,
            updatedAt: new Date()
          })
          .where(eq(schema.mediaItems.id, deleted.mediaItemId));

        return true;
      });
    });
  },
  async recordClick(userId, pointId) {
    return logger.measure("persistence.radio.click.record", {
      pointId,
      userId
    }, async () => {
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
          .insert(schema.userMediaClicks)
          .values({
            userId,
            mediaItemId: snapshot.id,
            clickCount: 1,
            lastClickedAt: new Date()
          })
          .onConflictDoUpdate({
            target: [schema.userMediaClicks.userId, schema.userMediaClicks.mediaItemId],
            set: {
              clickCount: sql`${schema.userMediaClicks.clickCount} + 1`,
              lastClickedAt: new Date()
            }
          })
          .returning({ clickCount: schema.userMediaClicks.clickCount });

        await tx
          .update(schema.mediaItems)
          .set({
            clickCount: sql`${schema.mediaItems.clickCount} + 1`,
            updatedAt: new Date()
          })
          .where(eq(schema.mediaItems.id, snapshot.id));

        return { clickCount: clickRow?.clickCount ?? 1 };
      });
    });
  }
};

async function upsertStation(tx: BlomoonTransaction, snapshot: RadioStationPersistenceSnapshot) {
  await tx
    .insert(schema.mediaModes)
    .values({
      id: RADIO_MODE_ID,
      label: "Radio",
      updatedAt: new Date()
    })
    .onConflictDoNothing();

  await tx
    .insert(schema.mediaProviders)
    .values({
      id: RADIO_BROWSER_PROVIDER_ID,
      modeId: RADIO_MODE_ID,
      name: RADIO_BROWSER_PROVIDER_NAME,
      url: RADIO_BROWSER_PROVIDER_URL,
      attribution: RADIO_BROWSER_ATTRIBUTION,
      updatedAt: new Date()
    })
    .onConflictDoNothing();

  await tx
    .insert(schema.mediaItems)
    .values({
      id: snapshot.id,
      modeId: RADIO_MODE_ID,
      providerId: RADIO_BROWSER_PROVIDER_ID,
      providerItemId: snapshot.id,
      name: snapshot.name,
      summary: snapshot.summary,
      countryCode: snapshot.countryCode,
      country: snapshot.country,
      latitude: snapshot.latitude,
      longitude: snapshot.longitude,
      locationPrecision: snapshot.locationPrecision,
      sourceUrl: snapshot.sourceUrl,
      providerMetadata: snapshot.metrics,
      providerUpdatedAt: snapshot.timestamp ? new Date(snapshot.timestamp) : null,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: schema.mediaItems.id,
      set: {
        modeId: RADIO_MODE_ID,
        providerId: RADIO_BROWSER_PROVIDER_ID,
        providerItemId: snapshot.id,
        name: snapshot.name,
        summary: snapshot.summary,
        countryCode: snapshot.countryCode,
        country: snapshot.country,
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
        locationPrecision: snapshot.locationPrecision,
        sourceUrl: snapshot.sourceUrl,
        providerMetadata: snapshot.metrics,
        providerUpdatedAt: snapshot.timestamp ? new Date(snapshot.timestamp) : null,
        updatedAt: new Date()
      }
    });

  await tx
    .insert(schema.radioStations)
    .values({
      mediaItemId: snapshot.id,
      streamUrl: snapshot.streamUrl,
      language: snapshot.language,
      tags: snapshot.tags,
      codec: snapshot.codec,
      bitrate: snapshot.bitrate,
      providerVotes: snapshot.votes,
      providerClicks: snapshot.clickCount,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: schema.radioStations.mediaItemId,
      set: {
        streamUrl: snapshot.streamUrl,
        language: snapshot.language,
        tags: snapshot.tags,
        codec: snapshot.codec,
        bitrate: snapshot.bitrate,
        providerVotes: snapshot.votes,
        providerClicks: snapshot.clickCount,
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
