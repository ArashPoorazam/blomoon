import "server-only";

import { randomBytes } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { getDb, schema, type BlomoonDb } from "@/db";
import { logger } from "@/lib/server/logging";
import { getPointRefKey } from "@/lib/modes/pointKeys";
import { getModePersistenceAdapter, modePersistenceAdapters } from "./registry";
import { hydratePersistedPoints } from "./points";
import { resolveImportedFolderName } from "./favouriteFolderNames";
import type {
  FavouriteFolderDto,
  FavouriteFolderMembershipDto,
  FavouriteFolderSummaryDto,
  FavouriteRef,
  SharedFolderPreviewDto
} from "./types";

type BlomoonTransaction = Parameters<Parameters<BlomoonDb["transaction"]>[0]>[0];
type FolderMutationResult =
  | { kind: "ok"; folder: FavouriteFolderSummaryDto }
  | { kind: "not-found" }
  | { kind: "protected" };

const DEFAULT_FOLDER_NAME = "Favourites";

export async function ensureDefaultFavouriteFolders(userId: string, tx: BlomoonDb | BlomoonTransaction = getDb()) {
  await tx.insert(schema.userFavouriteFolders).values(modePersistenceAdapters.map(({ modeId }) => ({
    isDefault: true,
    modeId,
    name: DEFAULT_FOLDER_NAME,
    userId
  }))).onConflictDoNothing();
}

export async function listFavouriteFolders(userId: string): Promise<FavouriteFolderSummaryDto[]> {
  await ensureDefaultFavouriteFolders(userId);
  const rows = await logger.measure("persistence.favourite_folders.list", { userId }, () => getDb()
    .select({
      createdAt: schema.userFavouriteFolders.createdAt,
      description: schema.userFavouriteFolders.description,
      id: schema.userFavouriteFolders.id,
      importedAt: schema.userFavouriteFolders.importedAt,
      isDefault: schema.userFavouriteFolders.isDefault,
      itemCount: count(schema.userFavouriteFolderItems.mediaItemId),
      modeId: schema.userFavouriteFolders.modeId,
      name: schema.userFavouriteFolders.name,
      sharedAt: schema.userFavouriteFolders.sharedAt,
      updatedAt: schema.userFavouriteFolders.updatedAt
    })
    .from(schema.userFavouriteFolders)
    .leftJoin(schema.userFavouriteFolderItems, eq(schema.userFavouriteFolderItems.folderId, schema.userFavouriteFolders.id))
    .where(eq(schema.userFavouriteFolders.userId, userId))
    .groupBy(schema.userFavouriteFolders.id)
    .orderBy(desc(schema.userFavouriteFolders.isDefault), desc(schema.userFavouriteFolders.updatedAt)));

  return rows.map(folderRowToSummary);
}

export async function getFavouriteFolder(userId: string, folderId: string): Promise<FavouriteFolderDto | null> {
  const rows = await getDb().select({
    createdAt: schema.userFavouriteFolders.createdAt,
    description: schema.userFavouriteFolders.description,
    folderId: schema.userFavouriteFolders.id,
    folderModeId: schema.userFavouriteFolders.modeId,
    importedAt: schema.userFavouriteFolders.importedAt,
    isDefault: schema.userFavouriteFolders.isDefault,
    itemCreatedAt: schema.userFavouriteFolderItems.createdAt,
    modeId: schema.mediaItems.modeId,
    name: schema.userFavouriteFolders.name,
    pointId: schema.mediaItems.id,
    sharedAt: schema.userFavouriteFolders.sharedAt,
    updatedAt: schema.userFavouriteFolders.updatedAt
  }).from(schema.userFavouriteFolders)
    .leftJoin(schema.userFavouriteFolderItems, eq(schema.userFavouriteFolderItems.folderId, schema.userFavouriteFolders.id))
    .leftJoin(schema.mediaItems, eq(schema.mediaItems.id, schema.userFavouriteFolderItems.mediaItemId))
    .where(and(eq(schema.userFavouriteFolders.id, folderId), eq(schema.userFavouriteFolders.userId, userId)))
    .orderBy(desc(schema.userFavouriteFolderItems.createdAt));

  const first = rows[0];
  if (!first) return null;
  const refs = rows.flatMap((row) => row.modeId && row.pointId ? [{ modeId: row.modeId, pointId: row.pointId }] : []);
  const points = await hydratePersistedPoints(refs);

  return {
    ...folderRowToSummary({ ...first, modeId: first.folderModeId, id: first.folderId, itemCount: refs.length }),
    items: rows.flatMap((row) => {
      if (!row.modeId || !row.pointId || !row.itemCreatedAt) return [];
      const point = points.get(getPointRefKey({ modeId: row.modeId, pointId: row.pointId }));
      return point ? [{
        createdAt: row.itemCreatedAt.toISOString(),
        folderId,
        modeId: row.modeId,
        point,
        pointId: row.pointId
      }] : [];
    })
  };
}

export async function listFavouritePoints(userId: string) {
  const refs = await getDb().select({
    createdAt: schema.userFavouriteFolderItems.createdAt,
    folderId: schema.userFavouriteFolderItems.folderId,
    modeId: schema.mediaItems.modeId,
    pointId: schema.mediaItems.id
  }).from(schema.userFavouriteFolderItems)
    .innerJoin(schema.userFavouriteFolders, eq(schema.userFavouriteFolders.id, schema.userFavouriteFolderItems.folderId))
    .innerJoin(schema.mediaItems, eq(schema.mediaItems.id, schema.userFavouriteFolderItems.mediaItemId))
    .where(eq(schema.userFavouriteFolders.userId, userId));
  return {
    memberships: refs.map((ref) => ({ ...ref, createdAt: ref.createdAt.toISOString() })),
    points: [...(await hydratePersistedPoints(refs)).values()]
  };
}

export async function createFavouriteFolder(userId: string, name: string, description: string | null | undefined, modeId: string) {
  const [row] = await getDb().insert(schema.userFavouriteFolders).values({
    modeId,
    description: normalizeDescription(description),
    name: normalizeName(name),
    userId,
    updatedAt: new Date()
  }).returning();
  return row ? folderRowToSummary({ ...row, itemCount: 0 }) : null;
}

export async function updateFavouriteFolder(userId: string, folderId: string, input: { name: string; description?: string | null }): Promise<FolderMutationResult> {
  const [current] = await getDb().select().from(schema.userFavouriteFolders)
    .where(and(eq(schema.userFavouriteFolders.id, folderId), eq(schema.userFavouriteFolders.userId, userId))).limit(1);
  if (!current) return { kind: "not-found" };
  const name = normalizeName(input.name);
  if (current.isDefault && name !== DEFAULT_FOLDER_NAME) return { kind: "protected" };

  const [row] = await getDb().update(schema.userFavouriteFolders).set({
    description: normalizeDescription(input.description), name, updatedAt: new Date()
  }).where(eq(schema.userFavouriteFolders.id, folderId)).returning();
  const [itemCount] = await getDb().select({ value: count() }).from(schema.userFavouriteFolderItems)
    .where(eq(schema.userFavouriteFolderItems.folderId, folderId));
  return { kind: "ok", folder: folderRowToSummary({ ...row, itemCount: itemCount?.value ?? 0 }) };
}

export async function deleteFavouriteFolder(userId: string, folderId: string): Promise<"deleted" | "not-found" | "protected"> {
  return getDb().transaction(async (tx) => {
    const [folder] = await tx.select({ id: schema.userFavouriteFolders.id, isDefault: schema.userFavouriteFolders.isDefault })
      .from(schema.userFavouriteFolders)
      .where(and(eq(schema.userFavouriteFolders.id, folderId), eq(schema.userFavouriteFolders.userId, userId))).limit(1);
    if (!folder) return "not-found";
    if (folder.isDefault) return "protected";
    const items = await tx.select({ mediaItemId: schema.userFavouriteFolderItems.mediaItemId })
      .from(schema.userFavouriteFolderItems).where(eq(schema.userFavouriteFolderItems.folderId, folderId));
    await tx.delete(schema.userFavouriteFolders).where(eq(schema.userFavouriteFolders.id, folderId));
    await reconcileSavedItems(tx, userId, items.map((item) => item.mediaItemId));
    return "deleted";
  });
}

export async function addFavouriteFolderItem(userId: string, folderId: string, ref: FavouriteRef): Promise<FavouriteFolderMembershipDto | null> {
  const adapter = getModePersistenceAdapter(ref.modeId);
  const point = await adapter?.upsertPoint(ref.pointId);
  if (!point) return null;
  ref = { ...ref, pointId: point.id };

  return getDb().transaction(async (tx) => {
    const [folder] = await tx.select({ id: schema.userFavouriteFolders.id, modeId: schema.userFavouriteFolders.modeId }).from(schema.userFavouriteFolders)
      .where(and(eq(schema.userFavouriteFolders.id, folderId), eq(schema.userFavouriteFolders.userId, userId))).limit(1);
    if (!folder) return null;
    if (folder.modeId !== ref.modeId) throw new FolderModeMismatchError();
    const [saved] = await tx.insert(schema.userSavedMediaItems).values({ mediaItemId: ref.pointId, userId, updatedAt: new Date() })
      .onConflictDoNothing().returning({ id: schema.userSavedMediaItems.mediaItemId });
    if (saved) await incrementStarCount(tx, ref.pointId, 1);
    const [item] = await tx.insert(schema.userFavouriteFolderItems).values({ folderId, mediaItemId: ref.pointId, updatedAt: new Date() })
      .onConflictDoUpdate({ target: [schema.userFavouriteFolderItems.folderId, schema.userFavouriteFolderItems.mediaItemId], set: { updatedAt: new Date() } })
      .returning({ createdAt: schema.userFavouriteFolderItems.createdAt });
    await touchFolder(tx, folderId);
    return { createdAt: (item?.createdAt ?? new Date()).toISOString(), folderId, ...ref };
  });
}

export async function removeFavouriteFolderItem(userId: string, folderId: string, ref: FavouriteRef) {
  const [point] = await getModePersistenceAdapter(ref.modeId)?.hydratePoints([ref.pointId]) ?? [];
  if (!point) return false;
  ref = { ...ref, pointId: point.id };
  return getDb().transaction(async (tx) => {
    const [deleted] = await tx.delete(schema.userFavouriteFolderItems).where(and(
      eq(schema.userFavouriteFolderItems.folderId, folderId),
      eq(schema.userFavouriteFolderItems.mediaItemId, ref.pointId),
      sql`exists (select 1 from ${schema.userFavouriteFolders} where ${schema.userFavouriteFolders.id} = ${folderId} and ${schema.userFavouriteFolders.userId} = ${userId})`
    )).returning({ mediaItemId: schema.userFavouriteFolderItems.mediaItemId });
    if (!deleted) return false;
    await touchFolder(tx, folderId);
    await reconcileSavedItems(tx, userId, [deleted.mediaItemId]);
    return true;
  });
}

export async function enableFavouriteFolderShare(userId: string, folderId: string, rotate = false) {
  const folders = schema.userFavouriteFolders;
  const token = randomBytes(24).toString("base64url");
  const [row] = await getDb().update(folders).set({
    shareToken: rotate ? token : sql`coalesce(${folders.shareToken}, ${token})`,
    sharedAt: rotate ? new Date() : sql`coalesce(${folders.sharedAt}, now())`,
    updatedAt: rotate ? new Date() : sql`case when ${folders.shareToken} is null then now() else ${folders.updatedAt} end`
  }).where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .returning({ shareToken: folders.shareToken });
  return row?.shareToken ?? null;
}

export async function revokeFavouriteFolderShare(userId: string, folderId: string) {
  const [row] = await getDb().update(schema.userFavouriteFolders).set({ shareToken: null, sharedAt: null, updatedAt: new Date() })
    .where(and(eq(schema.userFavouriteFolders.id, folderId), eq(schema.userFavouriteFolders.userId, userId)))
    .returning({ id: schema.userFavouriteFolders.id });
  return Boolean(row);
}

export async function getSharedFolderPreview(token: string): Promise<SharedFolderPreviewDto | null> {
  const [folder] = await getDb().select({
    description: schema.userFavouriteFolders.description,
    id: schema.userFavouriteFolders.id,
    name: schema.userFavouriteFolders.name
  }).from(schema.userFavouriteFolders).where(eq(schema.userFavouriteFolders.shareToken, token)).limit(1);
  if (!folder) return null;
  const items = await getDb().select({ name: schema.mediaItems.name }).from(schema.userFavouriteFolderItems)
    .innerJoin(schema.mediaItems, eq(schema.mediaItems.id, schema.userFavouriteFolderItems.mediaItemId))
    .where(eq(schema.userFavouriteFolderItems.folderId, folder.id)).orderBy(desc(schema.userFavouriteFolderItems.createdAt));
  return { description: folder.description, itemCount: items.length, name: folder.name, sampleStationNames: items.slice(0, 3).map((item) => item.name) };
}

export async function isFavouriteFolderShareOwner(userId: string, token: string) {
  const [folder] = await getDb().select({ id: schema.userFavouriteFolders.id }).from(schema.userFavouriteFolders)
    .where(and(eq(schema.userFavouriteFolders.shareToken, token), eq(schema.userFavouriteFolders.userId, userId))).limit(1);
  return Boolean(folder);
}

export async function importSharedFavouriteFolder(userId: string, token: string): Promise<{ folderId: string; kind: "imported" | "existing" | "owner" } | null> {
  return getDb().transaction(async (tx) => {
    const [source] = await tx.select().from(schema.userFavouriteFolders).where(eq(schema.userFavouriteFolders.shareToken, token)).limit(1);
    if (!source) return null;
    if (source.userId === userId) return { folderId: source.id, kind: "owner" };
    const [prior] = await tx.select({ id: schema.userFavouriteFolders.id }).from(schema.userFavouriteFolders)
      .where(and(eq(schema.userFavouriteFolders.userId, userId), eq(schema.userFavouriteFolders.importSourceFolderId, source.id))).limit(1);
    if (prior) return { folderId: prior.id, kind: "existing" };

    const names = await tx.select({ name: schema.userFavouriteFolders.name }).from(schema.userFavouriteFolders)
      .where(and(eq(schema.userFavouriteFolders.userId, userId), eq(schema.userFavouriteFolders.modeId, source.modeId)));
    const name = resolveImportedFolderName(source.name, names.map((row) => row.name));
    const now = new Date();
    const [folder] = await tx.insert(schema.userFavouriteFolders).values({
      modeId: source.modeId,
      description: source.description,
      importSourceFolderId: source.id,
      importedAt: now,
      name,
      userId,
      updatedAt: now
    }).returning({ id: schema.userFavouriteFolders.id });
    const items = await tx.select({ mediaItemId: schema.userFavouriteFolderItems.mediaItemId })
      .from(schema.userFavouriteFolderItems).where(eq(schema.userFavouriteFolderItems.folderId, source.id));
    for (const item of items) {
      await tx.insert(schema.userFavouriteFolderItems).values({ folderId: folder.id, mediaItemId: item.mediaItemId });
      const [saved] = await tx.insert(schema.userSavedMediaItems).values({ userId, mediaItemId: item.mediaItemId })
        .onConflictDoNothing().returning({ id: schema.userSavedMediaItems.mediaItemId });
      if (saved) await incrementStarCount(tx, item.mediaItemId, 1);
    }
    return { folderId: folder.id, kind: "imported" };
  });
}

function folderRowToSummary(row: {
  modeId: string; createdAt: Date; description: string | null; id: string; importedAt: Date | null; isDefault: boolean;
  itemCount: number; name: string; sharedAt: Date | null; updatedAt: Date;
}): FavouriteFolderSummaryDto {
  return {
    modeId: row.modeId, createdAt: row.createdAt.toISOString(), description: row.description, id: row.id,
    importedAt: row.importedAt?.toISOString() ?? null, isDefault: row.isDefault,
    isImported: Boolean(row.importedAt), isShared: Boolean(row.sharedAt), itemCount: Number(row.itemCount),
    name: row.name, sharedAt: row.sharedAt?.toISOString() ?? null, updatedAt: row.updatedAt.toISOString()
  };
}

function normalizeName(name: string) { return name.trim().replace(/\s+/g, " "); }
function normalizeDescription(value?: string | null) { const next = value?.trim() ?? ""; return next || null; }
async function touchFolder(tx: BlomoonTransaction, folderId: string) {
  await tx.update(schema.userFavouriteFolders).set({ updatedAt: new Date() }).where(eq(schema.userFavouriteFolders.id, folderId));
}
async function reconcileSavedItems(tx: BlomoonTransaction, userId: string, ids: string[]) {
  for (const mediaItemId of [...new Set(ids)]) {
    const [remaining] = await tx.select({ id: schema.userFavouriteFolderItems.mediaItemId }).from(schema.userFavouriteFolderItems)
      .innerJoin(schema.userFavouriteFolders, eq(schema.userFavouriteFolders.id, schema.userFavouriteFolderItems.folderId))
      .where(and(eq(schema.userFavouriteFolders.userId, userId), eq(schema.userFavouriteFolderItems.mediaItemId, mediaItemId))).limit(1);
    if (remaining) continue;
    const [deleted] = await tx.delete(schema.userSavedMediaItems).where(and(eq(schema.userSavedMediaItems.userId, userId), eq(schema.userSavedMediaItems.mediaItemId, mediaItemId)))
      .returning({ id: schema.userSavedMediaItems.mediaItemId });
    if (deleted) await incrementStarCount(tx, mediaItemId, -1);
  }
}
async function incrementStarCount(tx: BlomoonTransaction, mediaItemId: string, delta: 1 | -1) {
  await tx.update(schema.mediaItems).set({
    starCount: delta > 0 ? sql`${schema.mediaItems.starCount} + 1` : sql`greatest(${schema.mediaItems.starCount} - 1, 0)`,
    updatedAt: new Date()
  }).where(eq(schema.mediaItems.id, mediaItemId));
}

export class FolderModeMismatchError extends Error {
  constructor() { super("This folder belongs to a different mode."); }
}
