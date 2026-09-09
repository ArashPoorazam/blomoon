import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { RadioStationRecord } from "@/lib/modes/radio/types";
import type { DataSourceInfo, TerraPoint } from "@/lib/modes/types";
import { users } from "./schema";

// Directory generations never reference account-owned media rows.
export const radioStationAliases = pgTable("radio_station_aliases", {
  stationId: uuid("station_id").primaryKey(),
  canonicalId: uuid("canonical_id").notNull(),
  identityKey: text("identity_key").notNull(),
  streamKey: text("stream_key").notNull(),
  record: jsonb("record").$type<RadioStationRecord>().notNull(),
}, (table) => [index("radio_alias_canonical_idx").on(table.canonicalId),
  index("radio_alias_identity_idx").on(table.identityKey), index("radio_alias_stream_idx").on(table.streamKey)]);

export const radioCatalogGenerations = pgTable("radio_catalog_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  stationCount: integer("station_count").notNull().default(0),
}, (table) => [uniqueIndex("radio_catalog_one_active").on(table.active).where(sql`${table.active}`)]);

export const radioCatalogEntries = pgTable("radio_catalog_entries", {
  generationId: uuid("generation_id").notNull().references(() => radioCatalogGenerations.id, { onDelete: "cascade" }),
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
}, (table) => [
  primaryKey({ columns: [table.generationId, table.stationId] }),
  index("radio_catalog_country_idx").on(table.generationId, table.countryCode),
  index("radio_catalog_search_idx").using("gin", table.searchText.op("gin_trgm_ops")),
  index("radio_catalog_prefix_idx").using("gin", sql`to_tsvector('simple', ${table.searchText})`),
  index("radio_catalog_votes_idx").on(table.generationId, table.votes.desc()),
]);

export const radioRecommendationSnapshots = pgTable("radio_recommendation_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerKey: text("owner_key").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  profileKey: text("profile_key").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  points: jsonb("points").$type<TerraPoint[]>().notNull(),
  source: jsonb("source").$type<DataSourceInfo>().notNull(),
  personalized: boolean("personalized").notNull(),
}, (table) => [index("radio_recommendation_expiry_idx").on(table.expiresAt),
  index("radio_recommendation_owner_idx").on(table.ownerKey, table.profileKey)]);

export const radioCatalogTerms = pgTable("radio_catalog_terms", {
  generationId: uuid("generation_id").notNull().references(() => radioCatalogGenerations.id, { onDelete: "cascade" }),
  term: text("term").notNull(),
}, (table) => [primaryKey({ columns: [table.generationId, table.term] }),
  index("radio_catalog_term_idx").using("gin", table.term.op("gin_trgm_ops"))]);
