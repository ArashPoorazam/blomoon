import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { nextCheckDelay } from "./policy";
import type { ProbeResult } from "./probe";
const sources = schema.radioStreamSources;
export type ClaimedSource = typeof sources.$inferSelect & { leaseToken: string };
export async function claimStreamSource(concurrency: number) {
  const token = randomUUID();
  return getDb().transaction(async (tx) => {
    // Serialize the short claim only, enforcing host limits across worker processes.
    await tx.execute(sql`select pg_advisory_xact_lock(72409190)`);
    const rows = await tx.execute<{ id: string }>(sql`select s.id from radio_stream_sources s
      where s.enabled and s.next_check<=now() and (s.lease_until is null or s.lease_until<now())
      and (select count(*) from radio_stream_sources where lease_until > now()) < ${concurrency}
      and not exists (select 1 from media_blocks b where b.mode_id='radio' and b.point_id=s.station_id)
      and not exists (select 1 from radio_curated_stations c where c.station_id=s.station_id and not c.enabled)
      and (select count(*) from radio_stream_sources busy where busy.host=s.host and busy.lease_until>now()) < 2
      order by s.next_check,s.id limit 1 for update skip locked`);
    if (!rows[0]) return null;
    const [source] = await tx
      .update(sources)
      .set({ leaseToken: token, leaseUntil: new Date(Date.now() + 30_000) })
      .where(eq(sources.id, rows[0].id))
      .returning();
    return { ...source, leaseToken: token };
  });
}

export async function releaseStreamClaim(source: ClaimedSource) {
  await getDb()
    .update(sources)
    .set({ leaseToken: null, leaseUntil: null, nextCheck: new Date(Date.now() + 60_000) })
    .where(and(eq(sources.id, source.id), eq(sources.leaseToken, source.leaseToken)));
}
export async function completeStreamCheck(source: ClaimedSource, result: ProbeResult) {
  const failures = result.ok ? 0 : source.failures + 1;
  const delay = nextCheckDelay(
    result.ok,
    failures,
    Boolean(source.lastPlayed && source.lastPlayed.getTime() > Date.now() - 86400000),
  );
  await getDb().transaction(async (tx) => {
    const updated = await tx
      .update(sources)
      .set({
        lastAttempt: new Date(),
        lastSuccess: result.ok ? new Date() : source.lastSuccess,
        failures,
        reason: result.reason,
        nextCheck: new Date(Date.now() + delay * (1 + Math.random() * 0.1)),
        leaseToken: null,
        leaseUntil: null,
      })
      .where(
        and(eq(sources.id, source.id), eq(sources.leaseToken, source.leaseToken), eq(sources.enabled, true)),
      )
      .returning({ id: sources.id });
    if (updated.length)
      await tx
        .update(schema.radioHealthWorker)
        .set({
          heartbeat: new Date(),
          probes: sql`${schema.radioHealthWorker.probes}+1`,
          successes: sql`${schema.radioHealthWorker.successes}+${result.ok ? 1 : 0}`,
          bytes: sql`((${schema.radioHealthWorker.bytes})::bigint+${result.bytes})::text`,
        })
        .where(eq(schema.radioHealthWorker.id, "primary"));
  });
}
