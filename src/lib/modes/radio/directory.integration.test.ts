import { afterAll, describe, expect, it, vi } from "vitest";
import { loadEnvConfig } from "@next/env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { BlomoonDb } from "@/db";

const holder = vi.hoisted(() => ({ db: null as Omit<BlomoonDb, "$client"> | null }));
vi.mock("@/db", async () => ({ schema: await import("@/db/schema"), getDb: () => holder.db!, isDatabaseConfigured: () => true }));
vi.mock("@/lib/persistence/favouriteFolders", () => ({ listFavouritePoints: async () => ({ points: [] }) }));
vi.mock("@/lib/playback-history/repository", () => ({ listPlaybackHistory: async () => [] }));
import { searchRadioDirectory } from "./directory";
import { directoryEntry, syncRadioDirectory } from "./directorySync";
import * as provider from "./provider";
import { getRadioRecommendations, RecommendationPageExpired } from "./recommendations";
import type { RadioStationRecord } from "./types";

const enabled = process.env.RADIO_DIRECTORY_INTEGRATION === "1";
if (enabled) {
  const environment = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "development" });
  loadEnvConfig(process.cwd(), true, undefined, true);
  Object.assign(process.env, { NODE_ENV: environment });
}
const client = enabled ? postgres(process.env.DATABASE_URL!, { max: 2, prepare: false }) : null;
afterAll(async () => { await client?.end(); });

describe.skipIf(!enabled)("radio directory PostgreSQL integration (rolled back)", () => {
  it("ranks search, isolates snapshots, and preserves pagination across profile/catalog changes", async () => {
    const rollback = new Error("test rollback");
    try {
      await drizzle(client!, { schema }).transaction(async (tx) => {
        holder.db = tx;
        const owner = "11111111-1111-4111-8111-111111111111";
        await tx.insert(schema.users).values({ id: owner, email: "radio-discovery-test@example.invalid" });
        await tx.update(schema.radioCatalogGenerations).set({ active: false });
        const [generation] = await tx.insert(schema.radioCatalogGenerations).values({ active: true, publishedAt: new Date(), stationCount: 1000 }).returning();
        const names = ["Radio Paradise", "Radio Paradise Main Mix", "Radio Paradiso", "BBC World Service", "Jazz Berlin", "رادیو کیان"];
        const records: RadioStationRecord[] = Array.from({ length: 1000 }, (_, i) => {
          const point = { id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, modeId: "radio",
            name: names[i] ?? `Station ${i}`, countryCode: i === 4 ? "276" : "826", latitude: 52, longitude: 0,
            summary: "Test", metrics: { Country: i === 4 ? "Germany" : "United Kingdom", Language: "English", Tags: "jazz" } };
          return { point, detail: { ...point, fields: [] }, votes: i, clickCount: i, searchText: point.name,
            streamUrl: `https://example.com/${i}` };
        });
        for (let offset = 0; offset < records.length; offset += 250) {
          await tx.insert(schema.radioCatalogEntries).values(records.slice(offset, offset + 250).map((record) => directoryEntry(record, generation.id)));
        }
        await tx.execute(sql`insert into radio_catalog_terms(generation_id, term)
          select distinct generation_id, term from radio_catalog_entries, unnest(string_to_array(search_text, ' ')) term
          where generation_id = ${generation.id} and length(term) between 1 and 120 on conflict do nothing`);
        const search = (query: string, countryCode: string | null = null) => searchRadioDirectory({ query, countryCode, sort: "relevance", limit: 50, offset: 0 });
        expect((await search("Radio Paradise"))?.points[0].name).toBe("Radio Paradise");
        expect((await search("paradse"))?.points.some((point) => point.name === "Radio Paradise")).toBe(true);
        expect((await search("germnay jazz"))?.points[0].name).toBe("Jazz Berlin");
        expect((await search("united king"))?.points.length).toBe(50);
        expect((await search("bbc"))?.points[0].name).toBe("BBC World Service");
        expect((await search("كيان"))?.points[0].name).toBe("رادیو کیان");
        expect((await search("paradise", "276"))?.points).toHaveLength(0);
        expect((await search("zzzxqvnotastation"))?.total).toBe(0);
        // Search uses nested savepoints in this rollback harness. Its SET LOCAL
        // timeout otherwise leaks into the subsequent full-catalog publication.
        await tx.execute(sql`set local statement_timeout = '0'`);
        const first = await getRadioRecommendations(owner, 50, 0);
        expect(first.points).toHaveLength(50);
        expect(first.total).toBe(500);
        expect(first.catalogTotal).toBe(1000);
        const second = await getRadioRecommendations(owner, 50, 50, first.pageToken);
        expect(second.catalogTotal).toBe(1000);
        expect(second.points.some((point) => first.points.some((other) => other.id === point.id))).toBe(false);
        await expect(getRadioRecommendations("another-owner", 50, 0, first.pageToken)).rejects.toBeInstanceOf(RecommendationPageExpired);
        await expect(getRadioRecommendations(null, 50, 0, first.pageToken)).rejects.toBeInstanceOf(RecommendationPageExpired);
        vi.spyOn(provider, "getRadioBrowserHosts").mockResolvedValue(["de1.api.radio-browser.info"]);
        vi.spyOn(provider, "fetchRadioBrowserHostJson").mockRejectedValue(new Error("Provider timeout"));
        await expect(syncRadioDirectory()).rejects.toThrow("Directory synchronization failed");
        vi.restoreAllMocks();
        const [retained] = await tx.select().from(schema.radioCatalogGenerations).where(eq(schema.radioCatalogGenerations.active, true));
        expect(retained.id).toBe(generation.id);
        await drizzle(client!, { schema }).transaction(async (lockTx) => {
          await lockTx.execute(sql`select pg_advisory_xact_lock(72409188)`);
          expect(await syncRadioDirectory()).toEqual({ status: "busy" });
        });
        vi.spyOn(provider, "getRadioBrowserHosts").mockResolvedValue(["de1.api.radio-browser.info"]);
        vi.spyOn(provider, "fetchRadioBrowserHostJson")
          .mockResolvedValueOnce({ stations: 1000, stations_broken: 0 })
          .mockResolvedValueOnce(records.map(({ point, streamUrl }) => ({ stationuuid: point.id, name: point.name,
            url: streamUrl, country: "United Kingdom", countrycode: "GB", language: "English", tags: "jazz",
            lastcheckok: 1, geo_lat: 52, geo_long: 0 })));
        expect(await syncRadioDirectory()).toEqual({ status: "published", stations: 1000 });
        vi.restoreAllMocks();
        const [published] = await tx.select().from(schema.radioCatalogGenerations).where(eq(schema.radioCatalogGenerations.active, true));
        expect(published.id).not.toBe(generation.id);
        expect((await tx.select().from(schema.radioCatalogTerms).where(eq(schema.radioCatalogTerms.generationId, published.id))).length).toBeGreaterThan(1000);
        await tx.update(schema.radioCatalogGenerations).set({ active: false });
        expect((await getRadioRecommendations(owner, 50, 0, first.pageToken)).points).toEqual(first.points);
        await tx.update(schema.radioRecommendationSnapshots).set({ expiresAt: new Date(0) })
          .where(eq(schema.radioRecommendationSnapshots.id, first.pageToken!));
        await expect(getRadioRecommendations(owner, 50, 0, first.pageToken)).rejects.toBeInstanceOf(RecommendationPageExpired);
        await tx.delete(schema.users).where(eq(schema.users.id, owner));
        expect(await tx.select().from(schema.radioRecommendationSnapshots).where(eq(schema.radioRecommendationSnapshots.id, first.pageToken!))).toHaveLength(0);
        await tx.execute(sql`set local enable_seqscan = off`);
        const plan = await tx.execute(sql`explain select station_id from radio_catalog_entries where search_text like '%paradise%'`);
        expect(JSON.stringify(plan)).toContain("radio_catalog_search_idx");
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
  }, 30_000);
});
