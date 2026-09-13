import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adminModes } from "./registry";
import { getModeSettings } from "./settings";
import { getMonitoring } from "./monitor";
export async function modesOverview() {
  return Promise.all(
    adminModes.map(async (mode) => ({
      ...mode.descriptor,
      settings: await getModeSettings(mode.descriptor.id),
      metrics: await mode.metrics(),
    })),
  );
}
export async function activity(query: URLSearchParams) {
  const q = (query.get("q") ?? "").slice(0, 120),
    actor = (query.get("actor") ?? "").slice(0, 80),
    severity = (query.get("severity") ?? "").slice(0, 20);
  const since = query.get("since");
  const date =
    since &&
    /^\d{4}-\d{2}-\d{2}$/.test(since) &&
    Number.isFinite(Date.parse(since))
      ? since
      : "1970-01-01";
  return getDb().execute<{
    id: string;
    actor_id: string | null;
    resource: string;
    action: string;
    severity: string;
    created_at: string;
  }>(sql`
    select * from (
      select id,actor_id,resource,action,'audit' as severity,created_at from admin_audit
      union all select id,null::uuid,resource,event,severity,created_at from admin_events
    ) a where resource ilike ${`%${q}%`} and (${!actor} or actor_id::text=${actor}) and (${!severity} or severity=${severity}) and created_at>=${date}::date
    order by created_at desc limit 100`);
}
export async function overview() {
  const [counts] = await getDb().execute<{
    users: number;
    suspended: number;
    blocked: number;
    failed_jobs: number;
  }>(sql`select
    (select count(*)::int from users) as users,(select count(*)::int from user_suspensions) as suspended,
    (select count(*)::int from media_blocks) as blocked,(select count(*)::int from admin_jobs where status='failed') as failed_jobs`);
  return {
    counts,
    monitoring: await getMonitoring(1),
    modes: await modesOverview(),
    activity: await activity(new URLSearchParams()),
  };
}
export async function issues() {
  const [monitor, modes] = await Promise.all([
    getMonitoring(1),
    modesOverview(),
  ]);
  const items: { id: string; message: string; href: string }[] = [];
  if (monitor.stale)
    items.push({
      id: "monitor",
      message: "Host collector is missing or stale.",
      href: "/omnisire/servers",
    });
  const expectedServices = ["app", "postgres", "traefik", "catalog", "health"];
  if (monitor.latest)
    for (const name of expectedServices)
      if (!monitor.latest.snapshot.services.some((s) => s.name === name))
        items.push({
          id: `missing:${name}`,
          message: `No ${name} container reading is available.`,
          href: "/omnisire/servers",
        });
  for (const service of monitor.latest?.snapshot.services ?? [])
    if (service.state !== "running" || service.health === "unhealthy")
      items.push({
        id: `service:${service.name}`,
        message: `${service.name}: ${service.state} / ${service.health}`,
        href: "/omnisire/servers",
      });
  for (const m of modes) {
    if (
      !m.metrics.worker ||
      Date.now() - Date.parse(m.metrics.worker.heartbeat) > 120000
    )
      items.push({
        id: `worker:${m.id}`,
        message: `${m.label} worker heartbeat is overdue.`,
        href: "/omnisire/modes",
      });
    if (
      !m.metrics.catalogUpdatedAt ||
      Date.now() - Date.parse(m.metrics.catalogUpdatedAt) > 12 * 3600000
    )
      items.push({
        id: `catalog:${m.id}`,
        message: `${m.label} catalog has not published within 12 hours.`,
        href: "/omnisire/modes",
      });
  }
  const [failed] = await getDb().execute<{ count: number }>(
    sql`select count(*)::int as count from admin_jobs where status='failed'`,
  );
  if (failed.count)
    items.push({
      id: "jobs",
      message: `${failed.count} failed operations need review.`,
      href: "/omnisire/jobs",
    });
  return items;
}
