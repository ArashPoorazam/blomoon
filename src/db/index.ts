import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { logger } from "@/lib/server/logging";
import * as schema from "./schema";

let client: postgres.Sql | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Blomoon account data.");
  }

  if (!client) {
    logger.info("db.client.init", {
      message: "Initializing database client"
    });
    client = postgres(process.env.DATABASE_URL, {
      debug: (connection, query) => {
        logger.debug("db.query.start", {
          context: {
            connection,
            query
          },
          message: "Database query started"
        });
      },
      max: 5,
      onnotice: (notice) => {
        logger.info("db.notice", {
          context: {
            message: notice.message,
            severity: notice.severity
          },
          message: "Database notice received"
        });
      },
      prepare: false
    });
  }

  return drizzle(client, { schema });
}

export type BlomoonDb = ReturnType<typeof getDb>;

export { schema };
