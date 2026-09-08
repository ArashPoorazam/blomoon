import nextEnv from "@next/env";
import postgres from "postgres";

const requiredTables = [
  "accounts",
  "media_items",
  "media_modes",
  "media_providers",
  "pending_registrations",
  "radio_stations",
  "radio_catalog_generations",
  "radio_catalog_entries",
  "radio_catalog_terms",
  "radio_station_aliases",
  "radio_recommendation_snapshots",
  "sessions",
  "user_favourite_folder_items",
  "user_favourite_folders",
  "user_media_clicks",
  "user_playback_history",
  "user_saved_media_items",
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

  const [defaultFolderInvariant] = await sql`
    select count(*)::integer as violations
    from (
      select u.id
      from users u
      left join user_favourite_folders f on f.user_id = u.id and f.is_default = true
      group by u.id
      having count(f.id) <> 1
    ) invalid_users
  `;
  const [invalidDefaultNames] = await sql`
    select count(*)::integer as violations
    from user_favourite_folders
    where is_default = true and name <> 'Favourites'
  `;

  if (defaultFolderInvariant.violations > 0 || invalidDefaultNames.violations > 0) {
    console.error("Database schema violates the protected default favourite-folder invariant.");
    process.exit(1);
  }

  const [invalidAliases] = await sql`
    select count(*)::integer as violations from radio_station_aliases a
    left join radio_station_aliases canonical on canonical.station_id = a.canonical_id
    where canonical.station_id is null or canonical.canonical_id <> canonical.station_id
  `;
  const [duplicateMedia] = await sql`
    select count(*)::integer as violations from media_items m
    join radio_station_aliases a on a.station_id = m.id
    where a.station_id <> a.canonical_id
  `;
  if (invalidAliases.violations || duplicateMedia.violations) {
    throw new Error("Radio station identity invariants failed; inspect the consolidation report.");
  }
  console.log(`Database schema is ready: ${requiredTables.length} required tables found; protected folders and canonical station identities are valid.`);
} finally {
  await sql.end();
}
