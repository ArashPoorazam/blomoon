import "server-only";

import { sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";

const requiredTables = [
  "accounts",
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
    super("DATABASE_URL is required for Terravue account data.");
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
    return;
  }

  if (!isDatabaseConfigured()) {
    throw new DatabaseNotConfiguredError();
  }

  const rows = await getDb().execute<{ table_name: string }>(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
  `);
  const presentTables = new Set(Array.from(rows).map((row) => row.table_name));
  const missingTables = requiredTables.filter((tableName) => !presentTables.has(tableName));

  if (missingTables.length > 0) {
    throw new DatabaseSchemaMissingError(missingTables);
  }

  ready = true;
}

export function getRequiredDatabaseTables() {
  return [...requiredTables];
}
