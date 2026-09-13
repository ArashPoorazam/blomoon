import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { AdminError } from "./access";
export async function enqueueJob(
  modeId: string,
  kind: "sync" | "recheck",
  actorId: string | null,
  targetId = "",
) {
  return getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`${modeId}:${kind}:${targetId}`}))`,
    );
    const [existing] = await tx
      .select()
      .from(schema.adminJobs)
      .where(
        and(
          eq(schema.adminJobs.modeId, modeId),
          eq(schema.adminJobs.kind, kind),
          eq(schema.adminJobs.targetId, targetId),
          sql`status in ('queued','running')`,
        ),
      )
      .limit(1);
    if (existing) return { id: existing.id, status: existing.status };
    const [job] = await tx
      .insert(schema.adminJobs)
      .values({ modeId, kind, actorId, targetId })
      .returning();
    await tx.insert(schema.adminAudit).values({
      actorId,
      resource: `job:${job.id}`,
      action: "job.enqueue",
      changes: { modeId, kind, targetId },
    });
    return { id: job.id, status: job.status };
  });
}
export async function runNextJob(
  modeId: string,
  kind: string,
  run: (targetId: string) => Promise<string>,
) {
  const token = randomUUID();
  const job = await getDb().transaction(async (tx) => {
    await tx.execute(
      sql`update admin_jobs set status='failed',result='Worker lease expired after three attempts',updated_at=now() where status='running' and lease_until<now() and attempts>=3 and mode_id=${modeId} and kind=${kind}`,
    );
    const [candidate] = await tx
      .select()
      .from(schema.adminJobs)
      .where(
        and(
          eq(schema.adminJobs.modeId, modeId),
          eq(schema.adminJobs.kind, kind),
          sql`(status='queued' or (status='running' and lease_until<now() and attempts<3))`,
        ),
      )
      .orderBy(schema.adminJobs.createdAt)
      .limit(1)
      .for("update", { skipLocked: true });
    if (!candidate) return null;
    await tx
      .update(schema.adminJobs)
      .set({
        status: "running",
        leaseToken: token,
        leaseUntil: new Date(Date.now() + 60000),
        attempts: candidate.attempts + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.adminJobs.id, candidate.id));
    return candidate;
  });
  if (!job) return false;
  const heartbeat = setInterval(() => {
    void getDb()
      .update(schema.adminJobs)
      .set({ leaseUntil: new Date(Date.now() + 60000), updatedAt: new Date() })
      .where(
        and(
          eq(schema.adminJobs.id, job.id),
          eq(schema.adminJobs.leaseToken, token),
        ),
      )
      .catch(() => {});
  }, 15000);
  try {
    const result = await run(job.targetId);
    await finish("succeeded", result);
  } catch (error) {
    await finish(
      error instanceof AdminError
        ? "failed"
        : job.attempts + 1 < 3
          ? "queued"
          : "failed",
      error instanceof AdminError
        ? error.message
        : "Operation failed; check provider and worker health.",
    );
  } finally {
    clearInterval(heartbeat);
  }
  return true;
  async function finish(status: string, result: string) {
    await getDb().transaction(async (tx) => {
      const rows = await tx
        .update(schema.adminJobs)
        .set({
          status,
          result,
          leaseUntil: null,
          leaseToken: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.adminJobs.id, job!.id),
            eq(schema.adminJobs.leaseToken, token),
          ),
        )
        .returning({ id: schema.adminJobs.id });
      if (rows.length)
        await tx.insert(schema.adminEvents).values({
          severity: status === "succeeded" ? "info" : "error",
          event: `job.${status}`,
          resource: `job:${job!.id}`,
        });
    });
  }
}
export async function listJobs() {
  const rows = await getDb()
    .select()
    .from(schema.adminJobs)
    .orderBy(desc(schema.adminJobs.createdAt))
    .limit(100);
  return rows.map(({ leaseToken: _token, leaseUntil: _lease, ...job }) => job);
}
export async function retryJob(actorId: string, id: string) {
  const [job] = await getDb()
    .select()
    .from(schema.adminJobs)
    .where(eq(schema.adminJobs.id, id));
  if (!job) throw new AdminError(404, "Job not found.");
  if (job.status !== "failed")
    throw new AdminError(409, "Only failed jobs may be retried.");
  return enqueueJob(
    job.modeId,
    job.kind as "sync" | "recheck",
    actorId,
    job.targetId,
  );
}
