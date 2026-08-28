import nextEnv from "@next/env";
import postgres from "postgres";

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
];

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false
});

try {
  const rows = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
  `;
  const presentTables = new Set(rows.map((row) => row.table_name));
  const missingTables = requiredTables.filter((tableName) => !presentTables.has(tableName));

  if (missingTables.length > 0) {
    console.error(`Database schema is missing tables: ${missingTables.join(", ")}`);
    console.error("Run npm run db:migrate.");
    process.exit(1);
  }

  const securityRows = await sql`
    select c.relname as table_name, c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
  `;
  const rlsStatusByTable = new Map(securityRows.map((row) => [row.table_name, row.relrowsecurity]));
  const rlsDisabledTables = requiredTables.filter((tableName) => !rlsStatusByTable.get(tableName));

  if (rlsDisabledTables.length > 0) {
    console.error(`Database schema has tables without RLS enabled: ${rlsDisabledTables.join(", ")}`);
    console.error("Run npm run db:migrate.");
    process.exit(1);
  }

  console.log(`Database schema is ready: ${requiredTables.length} required tables found.`);
} finally {
  await sql.end();
}
