import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: postgres.Sql | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Terravue account data.");
  }

  client ??= postgres(process.env.DATABASE_URL, {
    max: 5,
    prepare: false
  });

  return drizzle(client, { schema });
}

export type TerravueDb = ReturnType<typeof getDb>;

export { schema };
