import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { XmlNode } from "@/lib/ingestion/contracts";
const time = (name: string) => timestamp(name, { withTimezone: true });
export const ingestionSources = pgTable("ingestion_sources", {
  id: uuid("id").primaryKey().defaultRandom(), kind: text("kind").$type<"feed" | "guide">().notNull(),
  url: text("url").notNull(), origins: text("origins").array().notNull(), enabled: boolean("enabled").notNull().default(true),
  revision: integer("revision").notNull().default(1), intervalSeconds: integer("interval_seconds").notNull().default(3600),
  nextRun: time("next_run").notNull().defaultNow(), etag: text("etag"), lastModified: text("last_modified"), validatorUrl: text("validator_url"),
  lastSuccess: time("last_success"), updatedAt: time("updated_at").notNull().defaultNow(),
}, t => [index("ingestion_source_due_idx").on(t.nextRun).where(sql`${t.enabled}`), check("ingestion_source_kind", sql`${t.kind} in ('feed','guide')`), check("ingestion_source_interval", sql`${t.intervalSeconds} between 60 and 86400`)]).enableRLS();
export const ingestionJobs = pgTable("ingestion_jobs", {
  id: uuid("id").primaryKey().defaultRandom(), sourceId: uuid("source_id").notNull().references(() => ingestionSources.id),
  revision: integer("revision").notNull(), dedupeKey: text("dedupe_key").notNull(), status: text("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0), dueAt: time("due_at").notNull().defaultNow(),
  leaseToken: uuid("lease_token"), leaseUntil: time("lease_until"), errorCode: text("error_code"),
  createdAt: time("created_at").notNull().defaultNow(), updatedAt: time("updated_at").notNull().defaultNow(),
}, t => [uniqueIndex("ingestion_job_dedupe_idx").on(t.sourceId, t.dedupeKey), uniqueIndex("ingestion_job_active_idx").on(t.sourceId).where(sql`${t.status} in ('queued','running')`), index("ingestion_job_due_idx").on(t.dueAt).where(sql`${t.status} in ('queued','running')`), check("ingestion_job_status", sql`${t.status} in ('queued','running','succeeded','failed')`), check("ingestion_job_attempts", sql`${t.attempts} between 0 and 3`)]).enableRLS();
export const ingestionDocuments = pgTable("ingestion_documents", {
  sourceId: uuid("source_id").primaryKey().references(() => ingestionSources.id), revision: integer("revision").notNull(),
  document: jsonb("document").$type<XmlNode>().notNull(), updatedAt: time("updated_at").notNull().defaultNow(),
}).enableRLS();
export const ingestionHostSlots = pgTable("ingestion_host_slots", {
  token: uuid("token").primaryKey(), host: text("host").notNull(), expiresAt: time("expires_at").notNull(),
}, t => [index("ingestion_host_expiry_idx").on(t.host, t.expiresAt)]).enableRLS();
