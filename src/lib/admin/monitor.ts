import "server-only";
import { timingSafeEqual, createHash } from "node:crypto";
import { desc, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { AdminError } from "./access";
import { monitorInput, isStale } from "./monitor-contract";
export function checkCollectorToken(header: string | null) {
  const secret = process.env.BLOMOON_COLLECTOR_TOKEN;
  if (!secret || secret.length < 32 || !header?.startsWith("Bearer "))
    return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(secret), digest(header.slice(7)));
}
export async function ingestSnapshot(input: unknown) {
  const snapshot = monitorInput.parse(input);
  if (Math.abs(Date.now() - Date.parse(snapshot.sampledAt)) > 60000)
    throw new AdminError(400, "Snapshot timestamp is stale.");
  if (
    new Set(snapshot.services.map((s) => s.name)).size !==
    snapshot.services.length
  )
    throw new AdminError(400, "Duplicate service.");
  await getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(72409200)`);
    const [latest] = await tx
      .select()
      .from(schema.monitorSamples)
      .orderBy(desc(schema.monitorSamples.receivedAt))
      .limit(1);
    if (latest && Date.now() - latest.receivedAt.getTime() < 10000)
      throw new AdminError(429, "Sampling too frequently.");
    if (
      latest &&
      Date.parse(snapshot.sampledAt) <= Date.parse(latest.snapshot.sampledAt)
    )
      throw new AdminError(409, "Snapshot is out of order.");
    await tx.insert(schema.monitorSamples).values({ snapshot });
    await tx.execute(
      sql`delete from monitor_samples where received_at < now() - interval '7 days'`,
    );
    await tx.execute(
      sql`delete from admin_events where created_at < now() - interval '7 days'`,
    );
  });
  return { accepted: true };
}
export async function getMonitoring(hours = 24) {
  const started = performance.now();
  await getDb().execute(sql`select 1`);
  const databaseLatencyMs = Math.round(performance.now() - started);
  const [latest] = await getDb()
    .select()
    .from(schema.monitorSamples)
    .orderBy(desc(schema.monitorSamples.receivedAt))
    .limit(1);
  const bucket = hours <= 1 ? 15 : hours <= 24 ? 300 : 1800;
  const history = await getDb().execute<{
    received_at: string;
    snapshot: import("./monitor-contract").MonitorSnapshot;
  }>(sql`
    select distinct on (bucket) received_at,snapshot from (
      select floor(extract(epoch from received_at)/${bucket}) as bucket,received_at,snapshot from monitor_samples
      where received_at > now() - ${hours} * interval '1 hour'
    ) sampled order by bucket, received_at desc limit 600`);
  return {
    latest: latest ?? null,
    stale: !latest || isStale(latest.receivedAt),
    history,
    databaseLatencyMs,
  };
}
