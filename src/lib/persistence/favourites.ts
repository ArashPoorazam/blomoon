import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema, type BlomoonDb } from "@/db";
import type { TerraModeId, TerraPoint } from "@/lib/modes/types";
import { logger } from "@/lib/server/logging";
import { toFavouriteKey } from "./favouriteKeys";
import { getModePersistenceAdapter } from "./registry";
import type { FavouriteDto, FavouriteListDto, FavouriteRef } from "./types";

type BlomoonTransaction = Parameters<Parameters<BlomoonDb["transaction"]>[0]>[0];

export async function listFavouriteLists(userId: string): Promise<FavouriteListDto[]> {
  const rows = await logger.measure("persistence.favourites.lists.list", { userId }, () => getDb()
    .select({
      createdAt: schema.userFavouriteLists.createdAt,
      id: schema.userFavouriteLists.id,
      itemCreatedAt: schema.userFavouriteListItems.createdAt,
      mediaItemId: schema.userFavouriteListItems.mediaItemId,
      modeId: schema.mediaItems.modeId,
      name: schema.userFavouriteLists.name,
      pointId: schema.mediaItems.id,
      updatedAt: schema.userFavouriteLists.updatedAt
    })
    .from(schema.userFavouriteLists)
    .leftJoin(schema.userFavouriteListItems, eq(schema.userFavouriteListItems.listId, schema.userFavouriteLists.id))
    .leftJoin(schema.mediaItems, eq(schema.mediaItems.id, schema.userFavouriteListItems.mediaItemId))
    .where(eq(schema.userFavouriteLists.userId, userId))
    .orderBy(desc(schema.userFavouriteLists.updatedAt), desc(schema.userFavouriteListItems.createdAt)));

  const pointIdsByMode = new Map<TerraModeId, Set<string>>();

  rows.forEach((row) => {
    if (!row.modeId || !row.pointId) {
      return;
    }

    const modePointIds = pointIdsByMode.get(row.modeId) ?? new Set<string>();
    modePointIds.add(row.pointId);
    pointIdsByMode.set(row.modeId, modePointIds);
  });

  const pointsByKey = new Map<string, TerraPoint>();

  await Promise.all(Array.from(pointIdsByMode.entries()).map(async ([modeId, pointIds]) => {
    const adapter = getModePersistenceAdapter(modeId);

    if (!adapter) {
      return;
    }

    const points = await adapter.hydrateFavouritePoints([...pointIds]);
    points.forEach((point) => {
      pointsByKey.set(toFavouriteKey({ modeId: point.modeId, pointId: point.id }), point);
    });
  }));

  const lists = new Map<string, FavouriteListDto>();

  rows.forEach((row) => {
    const list = lists.get(row.id) ?? {
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      itemCount: 0,
      items: [],
      name: row.name,
      updatedAt: row.updatedAt.toISOString()
    };

    if (row.modeId && row.pointId && row.itemCreatedAt) {
      const point = pointsByKey.get(toFavouriteKey({ modeId: row.modeId, pointId: row.pointId }));

      if (point) {
        list.items.push({
          createdAt: row.itemCreatedAt.toISOString(),
          listId: row.id,
          modeId: row.modeId,
          point,
          pointId: row.pointId
        });
        list.itemCount += 1;
      }
    }

    lists.set(row.id, list);
  });

  return [...lists.values()];
}

export async function createFavouriteList(userId: string, name: string) {
  const normalizedName = normalizeFavouriteListName(name);

  return logger.measure("persistence.favourites.list.create", { userId }, async () => {
    const [list] = await getDb()
      .insert(schema.userFavouriteLists)
      .values({
        name: normalizedName,
        userId,
        updatedAt: new Date()
      })
      .returning({
        createdAt: schema.userFavouriteLists.createdAt,
        id: schema.userFavouriteLists.id,
        name: schema.userFavouriteLists.name,
        updatedAt: schema.userFavouriteLists.updatedAt
      });

    return list ? listRowToDto(list) : null;
  });
}

export async function renameFavouriteList(userId: string, listId: string, name: string) {
  const normalizedName = normalizeFavouriteListName(name);

  return logger.measure("persistence.favourites.list.rename", { listId, userId }, async () => {
    const [list] = await getDb()
      .update(schema.userFavouriteLists)
      .set({
        name: normalizedName,
        updatedAt: new Date()
      })
      .where(and(
        eq(schema.userFavouriteLists.id, listId),
        eq(schema.userFavouriteLists.userId, userId)
      ))
      .returning({
        createdAt: schema.userFavouriteLists.createdAt,
        id: schema.userFavouriteLists.id,
        name: schema.userFavouriteLists.name,
        updatedAt: schema.userFavouriteLists.updatedAt
      });

    return list ? listRowToDto(list) : null;
  });
}

export async function deleteFavouriteList(userId: string, listId: string) {
  return logger.measure("persistence.favourites.list.delete", { listId, userId }, async () => getDb().transaction(async (tx) => {
    const [list] = await tx
      .select({ id: schema.userFavouriteLists.id })
      .from(schema.userFavouriteLists)
      .where(and(
        eq(schema.userFavouriteLists.id, listId),
        eq(schema.userFavouriteLists.userId, userId)
      ))
      .limit(1);

    if (!list) {
      return false;
    }

    const itemRows = await tx
      .select({ mediaItemId: schema.userFavouriteListItems.mediaItemId })
      .from(schema.userFavouriteListItems)
      .where(eq(schema.userFavouriteListItems.listId, listId));

    await tx
      .delete(schema.userFavouriteLists)
      .where(eq(schema.userFavouriteLists.id, listId));

    await reconcileSavedItems(tx, userId, itemRows.map((row) => row.mediaItemId));

    return true;
  }));
}

export async function addFavouriteListItem(userId: string, listId: string, ref: FavouriteRef): Promise<FavouriteDto | null> {
  const adapter = getModePersistenceAdapter(ref.modeId);

  if (!adapter) {
    return null;
  }

  const point = await adapter.upsertFavouritePoint(ref.pointId);

  if (!point) {
    return null;
  }

  return logger.measure("persistence.favourites.item.add", {
    listId,
    modeId: ref.modeId,
    pointId: ref.pointId,
    userId
  }, async () => getDb().transaction(async (tx) => {
    const [list] = await tx
      .select({ id: schema.userFavouriteLists.id })
      .from(schema.userFavouriteLists)
      .where(and(
        eq(schema.userFavouriteLists.id, listId),
        eq(schema.userFavouriteLists.userId, userId)
      ))
      .limit(1);

    if (!list) {
      return null;
    }

    const [saved] = await tx
      .insert(schema.userSavedMediaItems)
      .values({
        mediaItemId: ref.pointId,
        updatedAt: new Date(),
        userId
      })
      .onConflictDoNothing()
      .returning({ mediaItemId: schema.userSavedMediaItems.mediaItemId });

    if (saved) {
      await incrementStarCount(tx, ref.pointId, 1);
    }

    const [item] = await tx
      .insert(schema.userFavouriteListItems)
      .values({
        listId,
        mediaItemId: ref.pointId,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [schema.userFavouriteListItems.listId, schema.userFavouriteListItems.mediaItemId],
        set: { updatedAt: new Date() }
      })
      .returning({ createdAt: schema.userFavouriteListItems.createdAt });

    await touchFavouriteList(tx, listId);

    return {
      createdAt: (item?.createdAt ?? new Date()).toISOString(),
      listId,
      modeId: ref.modeId,
      point,
      pointId: ref.pointId
    };
  }));
}

export async function removeFavouriteListItem(userId: string, listId: string, ref: FavouriteRef) {
  return logger.measure("persistence.favourites.item.remove", {
    listId,
    modeId: ref.modeId,
    pointId: ref.pointId,
    userId
  }, async () => getDb().transaction(async (tx) => {
    const [deleted] = await tx
      .delete(schema.userFavouriteListItems)
      .where(and(
        eq(schema.userFavouriteListItems.listId, listId),
        eq(schema.userFavouriteListItems.mediaItemId, ref.pointId),
        sql`exists (
          select 1 from ${schema.userFavouriteLists}
          where ${schema.userFavouriteLists.id} = ${schema.userFavouriteListItems.listId}
            and ${schema.userFavouriteLists.userId} = ${userId}
        )`
      ))
      .returning({ mediaItemId: schema.userFavouriteListItems.mediaItemId });

    if (!deleted) {
      return false;
    }

    await touchFavouriteList(tx, listId);
    await reconcileSavedItems(tx, userId, [deleted.mediaItemId]);

    return true;
  }));
}

function listRowToDto(row: {
  createdAt: Date;
  id: string;
  name: string;
  updatedAt: Date;
}): FavouriteListDto {
  return {
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    itemCount: 0,
    items: [],
    name: row.name,
    updatedAt: row.updatedAt.toISOString()
  };
}

function normalizeFavouriteListName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

async function touchFavouriteList(tx: BlomoonTransaction, listId: string) {
  await tx
    .update(schema.userFavouriteLists)
    .set({ updatedAt: new Date() })
    .where(eq(schema.userFavouriteLists.id, listId));
}

async function reconcileSavedItems(tx: BlomoonTransaction, userId: string, mediaItemIds: string[]) {
  const uniqueMediaItemIds = [...new Set(mediaItemIds)];

  await Promise.all(uniqueMediaItemIds.map(async (mediaItemId) => {
    const [remaining] = await tx
      .select({ mediaItemId: schema.userFavouriteListItems.mediaItemId })
      .from(schema.userFavouriteListItems)
      .innerJoin(schema.userFavouriteLists, eq(schema.userFavouriteLists.id, schema.userFavouriteListItems.listId))
      .where(and(
        eq(schema.userFavouriteLists.userId, userId),
        eq(schema.userFavouriteListItems.mediaItemId, mediaItemId)
      ))
      .limit(1);

    if (remaining) {
      return;
    }

    const [deletedSaved] = await tx
      .delete(schema.userSavedMediaItems)
      .where(and(
        eq(schema.userSavedMediaItems.userId, userId),
        eq(schema.userSavedMediaItems.mediaItemId, mediaItemId)
      ))
      .returning({ mediaItemId: schema.userSavedMediaItems.mediaItemId });

    if (deletedSaved) {
      await incrementStarCount(tx, mediaItemId, -1);
    }
  }));
}

async function incrementStarCount(tx: BlomoonTransaction, mediaItemId: string, delta: 1 | -1) {
  await tx
    .update(schema.mediaItems)
    .set({
      starCount: delta > 0
        ? sql`${schema.mediaItems.starCount} + 1`
        : sql`greatest(${schema.mediaItems.starCount} - 1, 0)`,
      updatedAt: new Date()
    })
    .where(eq(schema.mediaItems.id, mediaItemId));
}
