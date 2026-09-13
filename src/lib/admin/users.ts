import "server-only";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { AdminError, isOwnerId } from "./access";
export async function listUsers(query: string, page: number) {
  const rows = await getDb().execute<{
    id: string;
    email: string;
    email_verified: boolean;
    created_at: string;
    last_login_at: string | null;
    session_count: number;
    reason: string | null;
    total: number;
  }>(sql`
    select u.id,u.email,u.email_verified,u.created_at,u.last_login_at,s.reason,
    (select count(*)::int from sessions where user_id=u.id and expires_at>now()) as session_count,
    count(*) over()::int as total from users u left join user_suspensions s on s.user_id=u.id
    where u.email ilike ${`%${query}%`} order by u.created_at desc,u.id limit 25 offset ${(page - 1) * 25}`);
  return {
    items: rows.map((u) => ({ ...u, owner: isOwnerId(u.id) })),
    total: rows[0]?.total ?? 0,
    page,
    pageSize: 25,
  };
}
export async function changeUser(actorId: string, id: string, input: unknown) {
  z.uuid().parse(id);
  const value = z
    .object({
      action: z.enum(["suspend", "restore", "revoke"]),
      reason: z.string().trim().min(1).max(500),
    })
    .strict()
    .parse(input);
  if (value.action === "suspend" && isOwnerId(id))
    throw new AdminError(409, "Owner accounts cannot be suspended.");
  return getDb().transaction(async (tx) => {
    const [user] = await tx
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .for("update");
    if (!user) throw new AdminError(404, "User not found.");
    if (value.action === "suspend")
      await tx
        .insert(schema.userSuspensions)
        .values({ userId: id, reason: value.reason })
        .onConflictDoUpdate({
          target: schema.userSuspensions.userId,
          set: { reason: value.reason, createdAt: new Date() },
        });
    if (value.action === "restore")
      await tx
        .delete(schema.userSuspensions)
        .where(eq(schema.userSuspensions.userId, id));
    if (value.action !== "restore")
      await tx.delete(schema.sessions).where(eq(schema.sessions.userId, id));
    await tx.insert(schema.adminAudit).values({
      actorId,
      resource: `user:${id}`,
      action: `user.${value.action}`,
      changes: { reason: value.reason },
    });
    return { saved: true };
  });
}
