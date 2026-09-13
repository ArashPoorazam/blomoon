import { afterAll, describe, expect, it, vi } from "vitest";
import { loadEnvConfig } from "@next/env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db", async () => ({
  schema: await import("@/db/schema"),
  getDb: () => holder.db,
  isDatabaseConfigured: () => true,
}));
vi.mock("@/lib/auth/server", () => ({ getOptionalUser: vi.fn() }));
import { isAdmin as isRadioAdmin, assertAdminOrigin } from "@/lib/admin/access";
import { requireAdmin as requireRadioAdmin } from "@/lib/admin/http";
import { getOptionalUser } from "@/lib/auth/server";
import {
  saveCuratedStation,
  recheckAsAdmin,
} from "../admin";
import { searchRadioDirectory } from "../directory";
import {
  getRadioDataset,
  getRadioCountryMarkerDataset,
  getRandomRadioPoint,
  getRadioDetail,
} from "../catalog";
import { getRadioPlayableStream } from "../playback";
import { eligibleSnapshotPoints, stationAvailability } from "./query";
import { publishProviderSources, sourceInput } from "./sources";
import { claimStreamSource, completeStreamCheck } from "./queue";
const enabled = process.env.RADIO_HEALTH_INTEGRATION === "1";
if (enabled) {
  const original = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "development" });
  loadEnvConfig(process.cwd(), true, undefined, true);
  Object.assign(process.env, { NODE_ENV: original });
}
const client = enabled ? postgres(process.env.DATABASE_URL!, { max: 2, prepare: false }) : null;
afterAll(async () => {
  await client?.end();
});
describe("admin boundary", () => {
  it("requires a verified configured account", async () => {
    const user = { id: "a", emailVerified: true };
    expect(isRadioAdmin(user, "")).toBe(false);
    expect(isRadioAdmin(user, "a")).toBe(true);
    expect(isRadioAdmin({ ...user, emailVerified: false }, "a")).toBe(false);
    expect(isRadioAdmin(null, "a")).toBe(false);
    vi.mocked(getOptionalUser).mockResolvedValue(null);
    await expect(requireRadioAdmin()).rejects.toMatchObject({ status: 401 });
  });
  it("rejects foreign origins", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://blomoon.example");
    expect(() =>
      assertAdminOrigin(
        new Request("https://blomoon.example", { headers: { origin: "https://evil.example" } }),
      ),
    ).toThrow();
    expect(() =>
      assertAdminOrigin(
        new Request("https://blomoon.example", { headers: { origin: "https://blomoon.example" } }),
      ),
    ).not.toThrow();
    vi.unstubAllEnvs();
  });
});
describe.skipIf(!enabled)("verified radio PostgreSQL integration (rolled back)", () => {
  it("leases once, respects host limits, recovers expired work and rejects stale results", async () => {
    const rollback=new Error("rollback");
    try { await drizzle(client!,{schema}).transaction(async tx => {
      holder.db=tx;
      await tx.update(schema.radioStreamSources).set({enabled:false,leaseUntil:null});
      const stationId="22222222-2222-4222-8222-222222222222";
      for(let i=0;i<3;i++)await tx.insert(schema.radioStreamSources).values(sourceInput(stationId,`https://example.com/${i}`,"curated"));
      const first=await claimStreamSource(16),second=await claimStreamSource(16);
      expect(first).not.toBeNull();expect(second).not.toBeNull();expect(first!.id).not.toBe(second!.id);
      expect(await claimStreamSource(16)).toBeNull();
      await tx.update(schema.radioStreamSources).set({leaseUntil:new Date(0)}).where(eq(schema.radioStreamSources.id,first!.id));
      const recovered=await claimStreamSource(16);expect(recovered!.id).toBe(first!.id);expect(recovered!.leaseToken).not.toBe(first!.leaseToken);
      await completeStreamCheck(first!,{ok:true,reason:null,bytes:100});
      let [row]=await tx.select().from(schema.radioStreamSources).where(eq(schema.radioStreamSources.id,first!.id));expect(row.lastSuccess).toBeNull();
      await completeStreamCheck(recovered!,{ok:true,reason:null,bytes:100});
      [row]=await tx.select().from(schema.radioStreamSources).where(eq(schema.radioStreamSources.id,first!.id));expect(row.lastSuccess).not.toBeNull();expect(row.leaseToken).toBeNull();
      throw rollback;
    }); }catch(error){if(error!==rollback)throw error;}
  });

  it("keeps curated identity and audit atomic, filters every discovery path, and recovers with an alternate", async () => {
    const rollback = new Error("rollback");
    try {
      await drizzle(client!, { schema }).transaction(async (tx) => {
        holder.db = tx;
        vi.stubEnv("BLOMOON_RADIO_HEALTH_MODE", "enforce");
        await tx.update(schema.radioCatalogGenerations).set({ active: false });
        await tx.delete(schema.radioCuratedStations);
        await tx.update(schema.radioStreamSources).set({ enabled: false });
        const input = {
          name: "Health Test Radio",
          countryCode: "GB",
          streams: ["https://example.com/live"],
          enabled: true,
        };
        const actor = "11111111-1111-4111-8111-111111111111";
        const { id } = await saveCuratedStation(actor, input);
        expect((await getRadioDetail(id))?.name).toBe(input.name);
        expect((await stationAvailability(id)).status).toBe("unverified");
        expect((await getRadioDataset()).points).toHaveLength(0);
        const [source] = await tx
          .select()
          .from(schema.radioStreamSources)
          .where(eq(schema.radioStreamSources.stationId, id));
        await tx
          .update(schema.radioStreamSources)
          .set({ lastSuccess: new Date(), lastAttempt: new Date() })
          .where(eq(schema.radioStreamSources.id, source.id));
        expect(
          (
            await searchRadioDirectory({
              countryCode: null,
              query: "Health",
              sort: "relevance",
              limit: 1,
              offset: 0,
            })
          ).total,
        ).toBe(1);
        expect((await getRadioDataset()).points).toHaveLength(1);
        expect((await getRadioCountryMarkerDataset("826")).points).toHaveLength(1);
        expect(
          (await searchRadioDirectory({ countryCode: "826", query: "", sort:"votes_desc", limit: 1, offset: 0 })).total,
        ).toBe(1);
        expect((await getRandomRadioPoint())?.point.id).toBe(id);
        expect((await getRadioPlayableStream(id)).providerId).toBeNull();
        const points = (await getRadioDataset()).points;
        await saveCuratedStation(actor, { ...input, name: "Renamed" }, id);
        const [retained] = await tx
          .select()
          .from(schema.radioStreamSources)
          .where(eq(schema.radioStreamSources.id, source.id));
        expect(retained.lastSuccess).not.toBeNull();
        await tx
          .update(schema.radioStreamSources)
          .set({ failures: 3 })
          .where(eq(schema.radioStreamSources.id, source.id));
        expect((await getRadioDataset()).points).toHaveLength(0);
        expect(await eligibleSnapshotPoints(points)).toEqual([]);
        expect((await getRadioDetail(id))?.availability?.status).toBe("unavailable");
        await expect(getRadioPlayableStream(id)).rejects.toMatchObject({ code: "no_source" });
        await saveCuratedStation(
          actor,
          { ...input, streams: [...input.streams, "https://example.com/alternate"] },
          id,
        );
        await tx
          .update(schema.radioStreamSources)
          .set({ lastSuccess: new Date() })
          .where(eq(schema.radioStreamSources.streamUrl, "https://example.com/alternate"));
        expect((await getRadioPlayableStream(id)).stream.streamUrl).toBe("https://example.com/alternate");
        await recheckAsAdmin(actor, id);
        await expect(recheckAsAdmin(actor, id)).rejects.toMatchObject({ status: 429 });
        await saveCuratedStation(actor, { ...input, enabled: false }, id);
        expect((await getRadioDataset()).points).toHaveLength(0);
        expect((await getRadioDetail(id))?.availability?.status).toBe("disabled");
        await expect(getRadioPlayableStream(id, true)).rejects.toMatchObject({ code: "no_source" });
        const audit = await tx
          .select()
          .from(schema.adminAudit)
          .where(eq(schema.adminAudit.resource, `radio:${id}`));
        expect(audit.length).toBeGreaterThanOrEqual(5);
        // Catalog publication cannot delete curated sources or reset their health.
        await publishProviderSources(tx, []);
        expect(
          await tx
            .select()
            .from(schema.radioStreamSources)
            .where(eq(schema.radioStreamSources.id, source.id)),
        ).toHaveLength(1);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
