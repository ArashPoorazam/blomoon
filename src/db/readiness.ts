import "server-only";

import { sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import { logger } from "@/lib/server/logging";

const requiredTables = [
  "accounts",
  "pending_registrations",
  "sessions",
  "station_clicks",
  "stations",
  "users",
  "users_favourites",
  "verifications"
] as const;

let ready = false;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is required for Blomoon account data.");
  }
}

export class DatabaseSchemaMissingError extends Error {
  readonly missingTables: string[];

  constructor(missingTables: string[]) {
    super(`Database schema is not initialized. Missing tables: ${missingTables.join(", ")}.`);
    this.missingTables = missingTables;
  }
}

export async function ensureDatabaseReady() {
  if (ready) {
    logger.debug("db.readiness.cached", {
      message: "Database readiness check used cached result"
    });
    return;
  }

  if (!isDatabaseConfigured()) {
    logger.warn("db.readiness.not_configured", {
      message: "Database readiness check failed because DATABASE_URL is not configured"
    });
    throw new DatabaseNotConfiguredError();
  }

  const rows = await logger.measure("db.readiness.check", {
    requiredTableCount: requiredTables.length
  }, () => getDb().execute<{ table_name: string }>(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
    `));
  const presentTables = new Set(Array.from(rows).map((row) => row.table_name));
  const missingTables = requiredTables.filter((tableName) => !presentTables.has(tableName));

  if (missingTables.length > 0) {
    logger.error("db.readiness.missing_tables", {
      context: { missingTables },
      message: "Database schema is missing required tables"
    });
    throw new DatabaseSchemaMissingError(missingTables);
  }

  ready = true;
  logger.info("db.readiness.ready", {
    context: {
      requiredTableCount: requiredTables.length
    },
    message: "Database schema is ready"
  });
}

export function getRequiredDatabaseTables() {
  return [...requiredTables];
}
