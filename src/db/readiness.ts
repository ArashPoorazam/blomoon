import "server-only";

import { sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import { logger } from "@/lib/server/logging";

const requiredTables = [
  "accounts",
  "media_items",
  "media_modes",
  "media_providers",
  "pending_registrations",
  "radio_stations",
  "sessions",
  "user_favourites",
  "user_media_clicks",
  "users",
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

export class DatabaseRlsDisabledError extends Error {
  readonly tableNames: string[];

  constructor(tableNames: string[]) {
    super(`Database tables require row level security: ${tableNames.join(", ")}.`);
    this.tableNames = tableNames;
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

  const tableSecurityRows = await getDb().execute<{ relrowsecurity: boolean; table_name: string }>(sql`
    select c.relname as table_name, c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
  `);
  const rlsStatusByTable = new Map(Array.from(tableSecurityRows).map((row) => [row.table_name, row.relrowsecurity]));
  const rlsDisabledTables = requiredTables.filter((tableName) => !rlsStatusByTable.get(tableName));

  if (rlsDisabledTables.length > 0) {
    logger.error("db.readiness.rls_disabled", {
      context: { tableNames: rlsDisabledTables },
      message: "Database schema has required public tables without row level security"
    });
    throw new DatabaseRlsDisabledError(rlsDisabledTables);
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
