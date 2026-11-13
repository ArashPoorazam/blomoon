import "server-only";
import type { Sql } from "postgres";

/** The coordinator needs ingestion tables, never account data or source-curation privileges. */
export async function assertIngestionRole(db: Sql, podcasts = false) {
  const [role] = await db`select rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolreplication from pg_roles where rolname=current_user`;
  const unrelated = await db`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p','v','m')
    and (not ${podcasts} or c.relname not in ('media_items','media_identity_aliases','podcast_shows','podcast_feeds','podcast_feed_aliases','podcast_episodes','podcast_enclosures'))
    and c.relname not in ('ingestion_sources','ingestion_jobs','ingestion_documents','ingestion_host_slots')
    and (has_table_privilege(current_user,c.oid,'SELECT') or has_table_privilege(current_user,c.oid,'INSERT')
      or has_table_privilege(current_user,c.oid,'UPDATE') or has_table_privilege(current_user,c.oid,'DELETE')) limit 1`;
  const [curation] = await db`select has_table_privilege(current_user,'ingestion_sources','INSERT') as insert,
    has_column_privilege(current_user,'ingestion_sources','url','UPDATE') as update`;
  if (!role || Object.values(role).some(Boolean) || unrelated.length || curation.insert || curation.update) {
    throw new Error("Ingestion requires a dedicated restricted database role");
  }
}
