import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema, type BlomoonDb } from "@/db";
import { getRadioStationPersistenceSnapshot } from "@/lib/modes/radio";
import { isRadioStationId } from "@/lib/modes/radio/api";
import type { RadioStationPersistenceSnapshot } from "@/lib/modes/radio/types";
import type { TerraPoint } from "@/lib/modes/types";
import { logger } from "@/lib/server/logging";
import type { ModePersistenceAdapter } from "./types";

type BlomoonTransaction = Parameters<Parameters<BlomoonDb["transaction"]>[0]>[0];

const RADIO_MODE_ID = "radio";
const RADIO_BROWSER_PROVIDER_ID = "radio-browser";
const RADIO_BROWSER_PROVIDER_NAME = "Radio Browser";
const RADIO_BROWSER_PROVIDER_URL = "https://www.radio-browser.info";
const RADIO_BROWSER_ATTRIBUTION = "Radio Browser community database";

export const radioPersistenceAdapter: ModePersistenceAdapter = {
  label: "Radio",
  modeId: RADIO_MODE_ID,
  async upsertFavouritePoint(pointId) {
    return logger.measure("persistence.radio.favourite_point.upsert", {
      pointId
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

        return stationSnapshotToPoint(snapshot);
      });
    });
  },
  async hydrateFavouritePoints(pointIds) {
    if (pointIds.length === 0) {
      return [];
    }

    const rows = await logger.measure("persistence.radio.favourite_points.hydrate", {
      count: pointIds.length
    }, () => getDb()
        .select({
          bitrate: schema.radioStations.bitrate,
          codec: schema.radioStations.codec,
          country: schema.mediaItems.country,
          countryCode: schema.mediaItems.countryCode,
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
        .from(schema.mediaItems)
        .innerJoin(schema.radioStations, eq(schema.radioStations.mediaItemId, schema.mediaItems.id))
        .where(and(
          inArray(schema.mediaItems.id, pointIds),
          eq(schema.mediaItems.modeId, RADIO_MODE_ID)
        )));

    const rowById = new Map(rows.map((row) => [row.id, row]));

    return pointIds
      .map((pointId) => rowById.get(pointId))
      .filter((row) => row !== undefined)
      .map(stationRowToPoint);
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
      providerMetadata: stationProviderMetadata(snapshot),
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
        providerMetadata: stationProviderMetadata(snapshot),
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
    artworkUrl: snapshot.artworkUrl ?? undefined,
    prominence: normalizeProminence(snapshot.clickCount, snapshot.votes),
    timestamp: snapshot.timestamp ?? undefined,
    summary: snapshot.summary,
    metrics: snapshot.metrics
  };
}

function stationProviderMetadata(snapshot: RadioStationPersistenceSnapshot) {
  return {
    ...snapshot.metrics,
    Artwork: snapshot.artworkUrl
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
    artworkUrl: typeof row.providerMetadata.Artwork === "string" ? row.providerMetadata.Artwork : undefined,
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
