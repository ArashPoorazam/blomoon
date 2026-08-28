import "server-only";

import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { logger } from "@/lib/server/logging";

export type LoginTrackingSnapshot = {
  firstLoginAt: Date | null;
  loginCount: number;
};

export type LoginTrackingUpdate = {
  firstLoginAt: Date;
  lastLoginAt: Date;
  loginCount: number;
  updatedAt: Date;
};

export function applySuccessfulLogin(
  snapshot: LoginTrackingSnapshot,
  now: Date
): LoginTrackingUpdate {
  return {
    firstLoginAt: snapshot.firstLoginAt ?? now,
    lastLoginAt: now,
    loginCount: snapshot.loginCount + 1,
    updatedAt: now
  };
}

export async function recordSuccessfulLogin(userId: string) {
  await logger.measure("auth.login_tracking.update", {
    userId
  }, () => getDb()
    .update(schema.users)
    .set({
      firstLoginAt: sql<Date>`coalesce(${schema.users.firstLoginAt}, now())`,
      lastLoginAt: sql<Date>`now()`,
      loginCount: sql<number>`${schema.users.loginCount} + 1`,
      updatedAt: sql<Date>`now()`
    })
    .where(eq(schema.users.id, userId)));
}
