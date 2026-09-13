import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { ApplicationSettings, ModeSettings } from "@/lib/admin/contracts";
import type { MonitorSnapshot } from "@/lib/admin/monitor-contract";
export const adminSettings = pgTable("admin_settings", {
  id: text("id").primaryKey(),
  value: jsonb("value").$type<ApplicationSettings | ModeSettings>().notNull(),
  version: integer("version").notNull().default(0),
}).enableRLS();
export const adminAudit = pgTable(
  "admin_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id"),
    resource: text("resource").notNull(),
    action: text("action").notNull(),
    changes: jsonb("changes").$type<unknown>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("admin_audit_date_idx").on(t.createdAt)],
).enableRLS();
export const userSuspensions = pgTable("user_suspensions", {
  userId: uuid("user_id").primaryKey(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS();
export const mediaBlocks = pgTable("media_blocks", {
  key: text("key").primaryKey(),
  modeId: text("mode_id").notNull(),
  pointId: uuid("point_id").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS();
export const adminJobs = pgTable(
  "admin_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modeId: text("mode_id").notNull(),
    kind: text("kind").notNull(),
    targetId: text("target_id").notNull().default(""),
    actorId: uuid("actor_id"),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    leaseToken: uuid("lease_token"),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    result: text("result"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("admin_jobs_status_idx").on(t.status, t.createdAt)],
).enableRLS();
export const monitorSamples = pgTable(
  "monitor_samples",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    snapshot: jsonb("snapshot").$type<MonitorSnapshot>().notNull(),
  },
  (t) => [index("monitor_samples_date_idx").on(t.receivedAt)],
).enableRLS();
export const adminEvents = pgTable(
  "admin_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    severity: text("severity").notNull(),
    event: text("event").notNull(),
    resource: text("resource").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("admin_events_date_idx").on(t.createdAt)],
).enableRLS();
