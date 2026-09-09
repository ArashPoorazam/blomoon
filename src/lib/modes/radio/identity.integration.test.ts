import { afterAll, describe, expect, it } from "vitest";
import { loadEnvConfig } from "@next/env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { publishStationIdentities } from "./identityStore";

const enabled = process.env.RADIO_DIRECTORY_INTEGRATION === "1";
if (enabled) {
  const environment = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "development" });
  loadEnvConfig(process.cwd(), true, undefined, true);
  Object.assign(process.env, { NODE_ENV: environment });
}
const client = enabled ? postgres(process.env.DATABASE_URL!, { max: 1, prepare: false }) : null;
afterAll(async () => { await client?.end(); });

describe.skipIf(!enabled)("station identity consolidation (rolled back)", () => {
  it("preserves folders, days and clicks; rejects duplicate alias saves", async () => {
    const rollback = new Error("rollback");
    try {
      await drizzle(client!, { schema }).transaction(async (tx) => {
        const owner = "33333333-3333-4333-8333-333333333333";
        const a = "44444444-4444-4444-8444-444444444444";
        const b = "55555555-5555-4555-8555-555555555555";
        await tx.insert(schema.users).values({ id: owner, email: "identity-test@example.invalid" });
        const folders = await tx.insert(schema.userFavouriteFolders).values([
          { userId: owner, modeId: "radio", name: "one" }, { userId: owner, modeId: "radio", name: "two" }
        ]).returning();
        await tx.insert(schema.mediaModes).values({ id: "radio", label: "Radio" }).onConflictDoNothing();
        await tx.insert(schema.mediaProviders).values({ id: "radio-browser", modeId: "radio", name: "Radio Browser", url: "https://radio-browser.info", attribution: "test" }).onConflictDoNothing();
        for (const id of [a, b]) {
          await tx.insert(schema.mediaItems).values({ id, modeId: "radio", providerId: "radio-browser", providerItemId: id,
            name: "Identity regression station", summary: "test", country: "Hungary", countryCode: "348",
            latitude: 47, longitude: 19, locationPrecision: "station", sourceUrl: "https://identity.example.invalid/" });
          await tx.insert(schema.radioStations).values({ mediaItemId: id, streamUrl: `https://identity.example.invalid/${id}.mp3`, providerVotes: id === a ? 10 : 1 });
          await tx.insert(schema.userSavedMediaItems).values({ userId: owner, mediaItemId: id });
          await tx.insert(schema.userFavouriteFolderItems).values({ folderId: folders[0].id, mediaItemId: id });
          await tx.insert(schema.userPlaybackHistory).values({ userId: owner, mediaItemId: id, playedOn: "2026-09-08" });
          await tx.insert(schema.userMediaClicks).values({ userId: owner, mediaItemId: id, clickCount: 2 });
        }
        await tx.insert(schema.userFavouriteFolderItems).values({ folderId: folders[1].id, mediaItemId: b });
        await tx.insert(schema.userPlaybackHistory).values({ userId: owner, mediaItemId: b, playedOn: "2026-09-07" });
        await publishStationIdentities(tx, []);
        await tx.execute(sql`select consolidate_radio_accounts()`);
        expect(await tx.select().from(schema.mediaItems).where(eq(schema.mediaItems.id, b))).toHaveLength(0);
        expect(await tx.select().from(schema.userSavedMediaItems).where(eq(schema.userSavedMediaItems.userId, owner))).toHaveLength(1);
        for (const folder of folders) {
          const items = await tx.select().from(schema.userFavouriteFolderItems).where(eq(schema.userFavouriteFolderItems.folderId, folder.id));
          expect(items.map((item) => item.mediaItemId)).toEqual([a]);
        }
        expect(await tx.select().from(schema.userPlaybackHistory).where(eq(schema.userPlaybackHistory.userId, owner))).toHaveLength(2);
        const [click] = await tx.select().from(schema.userMediaClicks).where(eq(schema.userMediaClicks.userId, owner));
        expect(click.clickCount).toBe(4);
        for (let i = 0; i < 3; i++) await tx.insert(schema.userSavedMediaItems)
          .values({ userId: owner, mediaItemId: b }).onConflictDoNothing();
        expect(await tx.select().from(schema.userSavedMediaItems).where(eq(schema.userSavedMediaItems.userId, owner))).toHaveLength(1);
        await tx.execute(sql`select consolidate_radio_accounts()`);
        const [unchanged] = await tx.select().from(schema.userMediaClicks).where(eq(schema.userMediaClicks.userId, owner));
        expect(unchanged.clickCount).toBe(4);
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
  }, 60_000);
});
