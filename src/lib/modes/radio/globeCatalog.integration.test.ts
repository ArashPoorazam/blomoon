import { afterAll, describe, expect, it, vi } from "vitest";
import { loadEnvConfig } from "@next/env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";
import type { BlomoonDb } from "@/db";
import type { RadioStationRecord } from "./types";

const holder = vi.hoisted(() => ({ db: null as Omit<BlomoonDb, "$client"> | null }));
vi.mock("@/db", async () => ({ schema: await import("@/db/schema"), getDb: () => holder.db!, isDatabaseConfigured: () => true }));
import { getRadioDataset } from "./globeCatalog";
import { directoryEntry } from "./directorySync";
import { sourceInput } from "./health/sources";

const enabled = process.env.RADIO_DIRECTORY_INTEGRATION === "1";
if (enabled) loadEnvConfig(process.cwd(), true, undefined, true);
const client = enabled ? postgres(process.env.DATABASE_URL!, { max: 1, prepare: false, connect_timeout: 8 }) : null;
afterAll(async () => { await client?.end(); });

describe.skipIf(!enabled)("default globe country coverage (rolled back)", () => {
  it("selects country leaders before the global cap and excludes invalid or ineligible stations", async () => {
    const rollback = new Error("test rollback");
    try {
      await drizzle(client!, { schema }).transaction(async tx => {
        holder.db = tx;
        await tx.delete(schema.radioCuratedStations);
        await tx.update(schema.radioCatalogGenerations).set({ active: false });
        await tx.insert(schema.adminSettings).values({ id: "mode:radio", value: { version: 0, enabled: true, policy: "enforce" } })
          .onConflictDoUpdate({ target: schema.adminSettings.id, set: { value: { version: 0, enabled: true, policy: "enforce" } } });
        const [generation] = await tx.insert(schema.radioCatalogGenerations)
          .values({ active: true, publishedAt: new Date(), stationCount: 43012 }).returning();
        const record = (i: number, countryCode: string, votes: number): RadioStationRecord => {
          const point = { id: `44444444-0000-4000-8000-${String(i).padStart(12, "0")}`, modeId: "radio",
            countryCode, name: `Station ${i}`, summary: "Test", latitude: 40, longitude: 0 };
          return { point, detail: { ...point, fields: [] }, votes, clickCount: 0,
            searchText: point.name, streamUrl: `https://example.invalid/${i}` };
        };
        const records = [
          ...Array.from({ length: 43000 }, (_, i) => record(i, "840", 10000 - i)),
          ...Array.from({ length: 8 }, (_, i) => record(43000 + i, "276", 10)),
          record(43008, "250", 0), record(43009, "250", 0),
          record(43010, "276", 100000), record(43011, "276", 100000),
        ];
        records[43001].clickCount = 1;
        records[43002].point.name = "A station";
        records[43003].point.name = "A station";
        records[43010].point.latitude = 400;
        for (let offset = 0; offset < records.length; offset += 250) {
          await tx.insert(schema.radioCatalogEntries).values(records.slice(offset, offset + 250).map(r => directoryEntry(r, generation.id)));
          await tx.insert(schema.radioStreamSources).values(records.slice(offset, offset + 250)
            .filter(r => r !== records[43011])
            .map(r => ({ ...sourceInput(r.point.id, r.streamUrl, "provider", r.point.id), lastSuccess: new Date() })));
        }
        const dataset = await getRadioDataset();
        expect(dataset.points).toHaveLength(1206);
        expect(new Set(dataset.points.map(p => p.id)).size).toBe(1206);
        expect(dataset.points.filter(p => p.countryCode === "276").map(p => p.id))
          .toEqual([43001, 43002, 43003, 43000].map(i => records[i].point.id));
        expect(dataset.points.filter(p => p.countryCode === "250")).toHaveLength(2);
        expect(dataset.points.some(p => p.id === records[43010].point.id || p.id === records[43011].point.id)).toBe(false);
        expect(dataset.points.slice(0, 1200).map(p => p.id)).toEqual(records.slice(0, 1200).map(r => r.point.id));
        expect(dataset.source.lastUpdated).toBeTruthy();
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  }, 30000);
});
