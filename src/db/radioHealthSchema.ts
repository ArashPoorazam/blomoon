import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  pgView,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { RadioStationRecord } from "@/lib/modes/radio/types";

const directoryColumns = () => ({
  stationId: uuid("station_id").notNull(),
  countryCode: text("country_code").notNull(),
  nameText: text("name_text").notNull(),
  countryText: text("country_text").notNull(),
  languageText: text("language_text").notNull(),
  tagText: text("tag_text").notNull(),
  searchText: text("search_text").notNull(),
  votes: integer("votes").notNull(),
  clicks: integer("clicks").notNull(),
  record: jsonb("record").$type<RadioStationRecord>().notNull(),
});
export const radioCuratedStations = pgTable(
  "radio_curated_stations",
  {
    ...directoryColumns(),
    enabled: boolean("enabled").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("radio_curated_station_idx").on(t.stationId)],
).enableRLS();
export const radioDirectory = pgView("radio_directory", directoryColumns()).existing();
export const radioStreamSources = pgTable(
  "radio_stream_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stationId: uuid("station_id").notNull(),
    sourceKey: text("source_key").notNull(),
    origin: text("origin").$type<"provider" | "curated">().notNull(),
    providerId: uuid("provider_id"),
    streamUrl: text("stream_url").notNull(),
    host: text("host").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    lastAttempt: timestamp("last_attempt", { withTimezone: true }),
    lastSuccess: timestamp("last_success", { withTimezone: true }),
    failures: integer("failures").notNull().default(0),
    reason: text("reason"),
    nextCheck: timestamp("next_check", { withTimezone: true }).notNull().defaultNow(),
    leaseToken: uuid("lease_token"),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    lastPlayed: timestamp("last_played", { withTimezone: true }),
    lastRequested: timestamp("last_requested", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("radio_source_key_idx").on(t.sourceKey),
    index("radio_source_station_idx").on(t.stationId),
    index("radio_source_due_idx").on(t.enabled, t.nextCheck),
    index("radio_source_host_idx").on(t.host, t.leaseUntil),
  ],
).enableRLS();
export const radioAdminAudit = pgTable("radio_admin_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").notNull(),
  stationId: uuid("station_id").notNull(),
  action: text("action").notNull(),
  changes: jsonb("changes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
export const radioHealthWorker = pgTable("radio_health_worker", {
  id: text("id").primaryKey(),
  heartbeat: timestamp("heartbeat", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull(),
  probes: integer("probes").notNull().default(0),
  successes: integer("successes").notNull().default(0),
  bytes: text("bytes").notNull().default("0"),
}).enableRLS();
