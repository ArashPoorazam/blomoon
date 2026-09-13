import { afterAll, describe, expect, it, vi } from "vitest";
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
import { getSettings, saveSettings, isSuspended } from "./settings";
import { ingestSnapshot, getMonitoring } from "./monitor";
import { defaultSettings } from "./contracts";
import { changeUser } from "./users";
import { enqueueJob, runNextJob } from "./jobs";
import { radioAdminAdapter } from "@/lib/modes/radio/adminAdapter";
import { saveCuratedStation } from "@/lib/modes/radio/admin";
import {
  getRadioDataset,
  getRadioDetail,
  getRandomRadioPoint,
} from "@/lib/modes/radio/catalog";
import { eligibleSnapshotPoints } from "@/lib/modes/radio/health/query";
import { getRadioPlayableStream } from "@/lib/modes/radio/playback";
const enabled = process.env.OMNISIRE_INTEGRATION === "1";
const client = enabled
  ? postgres(process.env.DATABASE_URL!, { max: 2, prepare: false })
  : null;
afterAll(async () => {
  await client?.end();
});
describe.skipIf(!enabled)("Omnisire database integration", () => {
  it("enforces settings concurrency, suspensions, curation, blocking, and job leases", async () => {
    const rollback = Symbol();
    try {
      await drizzle(client!, { schema }).transaction(async (tx) => {
        holder.db = tx;
        const [owner, user] = await tx
          .insert(schema.users)
          .values([
            { email: "omnisire-owner@example.test", emailVerified: true },
            { email: "omnisire-user@example.test", emailVerified: true },
          ])
          .returning();
        vi.stubEnv("BLOMOON_ADMIN_USER_IDS", owner.id);
        const settings = await getSettings();
        expect(settings.version).toBe(0);
        await saveSettings(owner.id, "application", {
          ...defaultSettings,
          registrationEnabled: false,
        });
        await expect(
          saveSettings(owner.id, "application", defaultSettings),
        ).rejects.toMatchObject({ status: 409 });
        await expect(
          tx.transaction(async (nested) => {
            await nested
              .insert(schema.users)
              .values({ email: "closed@example.test", emailVerified: true });
          }),
        ).rejects.toThrow();
        await tx.insert(schema.sessions).values({
          userId: user.id,
          token: "omnisire-test-session",
          expiresAt: new Date(Date.now() + 3600000),
        });
        await changeUser(owner.id, user.id, {
          action: "suspend",
          reason: "Test moderation",
        });
        expect(await isSuspended(user.id)).toBe(true);
        await expect(
          tx.transaction(async (nested) => {
            await nested
              .insert(schema.sessions)
              .values({
                userId: user.id,
                token: "suspended-attempt",
                expiresAt: new Date(Date.now() + 60000),
              });
          }),
        ).rejects.toThrow();
        expect(
          await tx
            .select()
            .from(schema.sessions)
            .where(eq(schema.sessions.userId, user.id)),
        ).toHaveLength(0);
        await expect(
          changeUser(owner.id, owner.id, {
            action: "suspend",
            reason: "Cannot suspend owner",
          }),
        ).rejects.toMatchObject({ status: 409 });
        await changeUser(owner.id, user.id, {
          action: "restore",
          reason: "Resolved",
        });
        expect(await isSuspended(user.id)).toBe(false);
        const { id } = await saveCuratedStation(owner.id, {
          name: "Omnisire test station",
          countryCode: "US",
          streams: ["https://example.com/omnisire-audio"],
        });
        await tx
          .update(schema.radioStreamSources)
          .set({ lastSuccess: new Date() })
          .where(eq(schema.radioStreamSources.stationId, id));
        expect((await getRadioPlayableStream(id)).stream.pointId).toBe(id);
        const before = await getRadioDataset();
        expect(before.points.some((p) => p.id === id)).toBe(true);
        await radioAdminAdapter.block(
          owner.id,
          id,
          true,
          "Unavailable for publication",
        );
        expect((await getRadioDataset()).points.some((p) => p.id === id)).toBe(
          false,
        );
        expect(await eligibleSnapshotPoints(before.points)).toEqual([]);
        expect((await getRadioDetail(id))?.availability?.status).toBe(
          "disabled",
        );
        expect(await getRandomRadioPoint()).toBeNull();
        await expect(getRadioPlayableStream(id)).rejects.toMatchObject({
          code: "no_source",
        });
        const page = await radioAdminAdapter.list({
          q: "Omnisire",
          country: "",
          provider: "",
          status: "",
          blocked: "true",
          page: 1,
        });
        expect(page.total).toBe(1);
        expect(page.items[0].name).toBe("Omnisire test station");
        expect(page.items[0].country).not.toContain("840");
        await radioAdminAdapter.block(owner.id, id, false, "Restored");
        expect((await getRadioPlayableStream(id)).stream.pointId).toBe(id);
        const job = await enqueueJob("radio", "sync", owner.id);
        expect((await enqueueJob("radio", "sync", owner.id)).id).toBe(job.id);
        await runNextJob("radio", "sync", async () => "Published");
        expect(
          (
            await tx
              .select()
              .from(schema.adminJobs)
              .where(eq(schema.adminJobs.id, job.id))
          )[0].status,
        ).toBe("succeeded");
        const expired = await enqueueJob("radio", "sync", owner.id);
        await tx
          .update(schema.adminJobs)
          .set({ status: "running", attempts: 1, leaseUntil: new Date(0) })
          .where(eq(schema.adminJobs.id, expired.id));
        await runNextJob("radio", "sync", async () => "Recovered");
        expect(
          (
            await tx
              .select()
              .from(schema.adminJobs)
              .where(eq(schema.adminJobs.id, expired.id))
          )[0].attempts,
        ).toBe(2);
        expect(
          (await tx.select().from(schema.adminAudit)).length,
        ).toBeGreaterThanOrEqual(8);
        await saveCuratedStation(
          owner.id,
          {
            name: "Omnisire test station",
            countryCode: "US",
            streams: ["https://example.com/replacement"],
          },
          id,
        );
        await radioAdminAdapter.block(owner.id, id, true, "Review");
        await radioAdminAdapter.block(owner.id, id, false, "Approved");
        const sourceState = await tx
          .select()
          .from(schema.radioStreamSources)
          .where(eq(schema.radioStreamSources.stationId, id));
        expect(
          sourceState.find(
            (s) => s.streamUrl === "https://example.com/omnisire-audio",
          )?.enabled,
        ).toBe(false);
        expect(
          sourceState.find(
            (s) => s.streamUrl === "https://example.com/replacement",
          )?.enabled,
        ).toBe(true);
        await ingestSnapshot({
          host: "primary",
          sampledAt: new Date().toISOString(),
          uptime: 1,
          cpu: 5,
          load: [1, 1, 1],
          memoryUsed: 100,
          memoryTotal: 200,
          swapUsed: 0,
          swapTotal: 0,
          diskUsed: 100,
          diskTotal: 200,
          diskReadBytesPerSecond: null,
          diskWriteBytesPerSecond: null,
          networkRxBytesPerSecond: null,
          networkTxBytesPerSecond: null,
          release: null,
          backup: null,
          services: [],
        });
        const monitoring = await getMonitoring(1);
        expect(monitoring.stale).toBe(false);
        expect(monitoring.history).toHaveLength(1);
        throw rollback;
      });
    } catch (e) {
      if (e !== rollback) throw e;
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
