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
      const [folder] = await tx.insert(schema.userFavouriteFolders).values({ userId: owner.id, name: "Sharing test" }).returning();
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
