import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { BlomoonDb } from "@/db";
import * as schema from "@/db/schema";

const holder = vi.hoisted(() => ({ db: null as Omit<BlomoonDb, "$client"> | null }));
vi.mock("@/db", async () => ({ schema: await import("@/db/schema"), getDb: () => holder.db!, isDatabaseConfigured: () => true }));
import { deleteFavouriteFolder, enableFavouriteFolderShare, getSharedFolderPreview, importSharedFavouriteFolder } from "./favouriteFolders";

// Explicit URL required: never load a developer's .env.local for these writes.
const enabled = process.env.FAVOURITES_INTEGRATION === "1";
const client = enabled ? postgres(process.env.DATABASE_URL!, { max: 1, prepare: false }) : null;
afterAll(async () => { await client?.end(); });

describe.skipIf(!enabled)("bulk favourite folders (PostgreSQL, rolled back)", () => {
  it("imports and deletes a large folder while preserving saves in other folders and other accounts", async () => {
    const rollback = new Error("test rollback");
    await expect(drizzle(client!, { schema }).transaction(async (tx) => {
      holder.db = tx;
      const [owner, recipient] = await tx.insert(schema.users).values([
        { email: `bulk-owner-${randomUUID()}@example.invalid` },
        { email: `bulk-recipient-${randomUUID()}@example.invalid` }
      ]).returning();
      const modeId = `bulk-${randomUUID()}`;
      await tx.insert(schema.mediaModes).values({ id: modeId, label: "Bulk test" });
      await tx.insert(schema.mediaProviders).values({ id: modeId, modeId, name: "Bulk test" });
      const records = Array.from({ length: 1005 }, (_, index) => ({
        id: randomUUID(), modeId, providerId: modeId, providerItemId: String(index), name: `Station ${index}`,
        summary: "Test", countryCode: "364", country: "Iran", latitude: 35, longitude: 51,
        locationPrecision: "station" as const, starCount: index === 0 ? 2 : 1
      }));
      await tx.insert(schema.mediaItems).values(records);
      const [source, retained] = await tx.insert(schema.userFavouriteFolders).values([
        { userId: owner.id, modeId, name: "Shared source" },
        { userId: recipient.id, modeId, name: "Keep this station" }
      ]).returning();
      await tx.insert(schema.userFavouriteFolderItems).values([
        ...records.map(({ id }) => ({ folderId: source.id, mediaItemId: id })),
        { folderId: retained.id, mediaItemId: records[0].id }
      ]);
      await tx.insert(schema.userSavedMediaItems).values([
        ...records.map(({ id }) => ({ userId: owner.id, mediaItemId: id })),
        { userId: recipient.id, mediaItemId: records[0].id }
      ]);
      const token = (await enableFavouriteFolderShare(owner.id, source.id))!;
      const preview = await getSharedFolderPreview(token);
      expect(preview?.itemCount).toBe(records.length);
      expect(preview?.sampleStationNames).toHaveLength(3);
      const imported = (await importSharedFavouriteFolder(recipient.id, token))!;
      expect(imported.kind).toBe("imported");
      expect(await importSharedFavouriteFolder(recipient.id, token)).toEqual({ ...imported, kind: "existing" });
      expect(await importSharedFavouriteFolder(owner.id, token)).toEqual({ folderId: source.id, kind: "owner" });
      const stars = () => tx.select({ count: schema.mediaItems.starCount }).from(schema.mediaItems)
        .where(eq(schema.mediaItems.modeId, modeId));
      expect((await stars()).every(({ count }) => count === 2)).toBe(true);
      expect(await deleteFavouriteFolder(owner.id, imported.folderId)).toBe("not-found");
      expect(await deleteFavouriteFolder(recipient.id, imported.folderId)).toBe("deleted");
      const remaining = await tx.select().from(schema.userSavedMediaItems).where(eq(schema.userSavedMediaItems.userId, recipient.id));
      expect(remaining.map(({ mediaItemId }) => mediaItemId)).toEqual([records[0].id]);
      expect((await stars()).filter(({ count }) => count === 2)).toHaveLength(1);
      expect((await stars()).filter(({ count }) => count === 1)).toHaveLength(1004);
      throw rollback;
    })).rejects.toBe(rollback);
  }, 15000);

  it("imports an empty folder and returns an empty preview", async () => {
    const rollback = new Error("test rollback");
    await expect(drizzle(client!, { schema }).transaction(async (tx) => {
      holder.db = tx;
      const [owner, recipient] = await tx.insert(schema.users).values([
        { email: `empty-owner-${randomUUID()}@example.invalid` },
        { email: `empty-recipient-${randomUUID()}@example.invalid` }
      ]).returning();
      const [folder] = await tx.insert(schema.userFavouriteFolders).values({ userId: owner.id, modeId: "radio", name: "Empty" }).returning();
      const token = (await enableFavouriteFolderShare(owner.id, folder.id))!;
      expect(await getSharedFolderPreview(token)).toMatchObject({ itemCount: 0, sampleStationNames: [] });
      expect((await importSharedFavouriteFolder(recipient.id, token))?.kind).toBe("imported");
      throw rollback;
    })).rejects.toBe(rollback);
  });
});
