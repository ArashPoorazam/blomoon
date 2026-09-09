import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { loadEnvConfig } from "@next/env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";
import type { BlomoonDb } from "@/db";

const holder = vi.hoisted(() => ({ db: null as Omit<BlomoonDb, "$client"> | null }));
vi.mock("@/db", async () => ({ schema: await import("@/db/schema"), getDb: () => holder.db!, isDatabaseConfigured: () => true }));
import { enableFavouriteFolderShare, getSharedFolderPreview } from "./favouriteFolders";

const enabled = process.env.FAVOURITES_INTEGRATION === "1";
if (enabled) {
  const environment = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "development" });
  loadEnvConfig(process.cwd(), true, undefined, true);
  Object.assign(process.env, { NODE_ENV: environment });
}
const client = enabled ? postgres(process.env.DATABASE_URL!, { max: 1, prepare: false }) : null;
afterAll(async () => { await client?.end(); });

describe.skipIf(!enabled)("folder share rotation PostgreSQL integration (rolled back)", () => {
  it("preserves normal sharing, rotates atomically, and excludes other owners", async () => {
    const rollback = new Error("test rollback");
    await expect(drizzle(client!, { schema }).transaction(async (tx) => {
      holder.db = tx;
      const [owner, other] = await tx.insert(schema.users).values([
        { email: "folder-owner-test@example.invalid" }, { email: "folder-other-test@example.invalid" }
      ]).returning();
      const [folder] = await tx.insert(schema.userFavouriteFolders).values({ userId: owner.id, modeId: "radio", name: "Sharing test" }).returning();
      const original = await enableFavouriteFolderShare(owner.id, folder.id);
      expect(original).toMatch(/^[A-Za-z0-9_-]{32}$/);
      expect(await enableFavouriteFolderShare(owner.id, folder.id)).toBe(original);
      expect(await enableFavouriteFolderShare(other.id, folder.id, true)).toBeNull();
      expect(await getSharedFolderPreview(original!)).not.toBeNull();
      const replacement = await enableFavouriteFolderShare(owner.id, folder.id, true);
      expect(replacement).not.toBe(original);
      expect(await getSharedFolderPreview(original!)).toBeNull();
      expect(await getSharedFolderPreview(replacement!)).toMatchObject({ name: "Sharing test" });
      expect(await enableFavouriteFolderShare(owner.id, folder.id)).toBe(replacement);
      throw rollback;
    })).rejects.toBe(rollback);
  });
});

describe.skipIf(!enabled)("mode-specific folders PostgreSQL integration (rolled back)", () => {
  it("creates protected folders per mode, scopes names, and preserves mode on import", async () => {
    const { createFavouriteFolder, ensureDefaultFavouriteFolders, importSharedFavouriteFolder, listFavouriteFolders } = await import("./favouriteFolders");
    const { modePersistenceAdapters } = await import("./registry");
    const rollback = new Error("test rollback");
    await expect(drizzle(client!, { schema }).transaction(async (tx) => {
      holder.db = tx;
      const [owner, recipient] = await tx.insert(schema.users).values([
        { email: "mode-owner@example.invalid" }, { email: "mode-recipient@example.invalid" }
      ]).returning();
      await tx.insert(schema.mediaModes).values({ id: "test-audio", label: "Test audio" });
      // A second registered adapter exercises the generic policy without enabling a product mode.
      modePersistenceAdapters.push({ ...modePersistenceAdapters[0], modeId: "test-audio", label: "Test audio" });
      try {
        await ensureDefaultFavouriteFolders(owner.id, tx);
        await ensureDefaultFavouriteFolders(owner.id, tx);
        const folders = await listFavouriteFolders(owner.id);
        expect(folders.filter((folder) => folder.isDefault).map((folder) => folder.modeId).sort()).toEqual(["radio", "test-audio"]);
        const radio = await createFavouriteFolder(owner.id, "Morning", null, "radio");
        const audio = await createFavouriteFolder(owner.id, "Morning", null, "test-audio");
        expect(radio?.modeId).toBe("radio");
        expect(audio?.modeId).toBe("test-audio");
        await expect(tx.transaction((savepoint) => savepoint.update(schema.userFavouriteFolders)
          .set({ modeId: "test-audio" }).where(eq(schema.userFavouriteFolders.id, radio!.id))))
          .rejects.toMatchObject({ cause: { code: "23514" } });
        await expect(tx.transaction((savepoint) => savepoint.insert(schema.userFavouriteFolders)
          .values({ userId: owner.id, modeId: "radio", name: "morning" })))
          .rejects.toMatchObject({ cause: { code: "23505" } });
        const [station] = await tx.select({ id: schema.mediaItems.id }).from(schema.mediaItems)
          .where(eq(schema.mediaItems.modeId, "radio")).limit(1);
        expect(station).toBeDefined();
        await expect(tx.transaction((savepoint) => savepoint.insert(schema.userFavouriteFolderItems)
          .values({ folderId: audio!.id, mediaItemId: station.id })))
          .rejects.toMatchObject({ cause: { code: "23514" } });
        const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` })
          .from(schema.userFavouriteFolderItems).where(eq(schema.userFavouriteFolderItems.folderId, audio!.id));
        expect(count).toBe(0);

        const token = await enableFavouriteFolderShare(owner.id, audio!.id);
        const imported = await importSharedFavouriteFolder(recipient.id, token!);
        expect(imported?.kind).toBe("imported");
        expect((await listFavouriteFolders(recipient.id)).find((folder) => folder.id === imported?.folderId)?.modeId).toBe("test-audio");
      } finally {
        modePersistenceAdapters.pop();
      }
      throw rollback;
    })).rejects.toBe(rollback);
  });
});
