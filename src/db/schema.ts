import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  selectedTheme: text("selected_theme", { enum: ["night", "atlas"] }).notNull().default("night"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex("users_email_normalized_unique").on(sql`lower(${table.email})`)
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("sessions_user_id_idx").on(table.userId),
  index("sessions_token_idx").on(table.token)
]);

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  issuer: text("issuer").notNull(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex("accounts_issuer_account_id_unique").on(table.issuer, table.accountId),
  index("accounts_user_id_idx").on(table.userId),
  index("accounts_provider_id_idx").on(table.providerId)
]);

export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("verifications_identifier_idx").on(table.identifier)
]);

export const stations = pgTable("stations", {
  id: uuid("id").primaryKey(),
  providerStationId: uuid("provider_station_id").notNull().unique(),
  providerName: text("provider_name").notNull().default("Radio Browser"),
  name: text("name").notNull(),
  summary: text("summary").notNull(),
  countryCode: text("country_code").notNull(),
  country: text("country").notNull(),
  language: text("language"),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  codec: text("codec"),
  bitrate: integer("bitrate"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  locationPrecision: text("location_precision", { enum: ["station", "country"] }).notNull(),
  streamUrl: text("stream_url").notNull(),
  sourceUrl: text("source_url"),
  providerVotes: integer("provider_votes").notNull().default(0),
  providerClicks: integer("provider_clicks").notNull().default(0),
  starCount: integer("star_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  providerMetadata: jsonb("provider_metadata").$type<Record<string, string | number | null>>().notNull().default({}),
  providerUpdatedAt: timestamp("provider_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("stations_country_code_idx").on(table.countryCode),
  index("stations_star_count_idx").on(table.starCount),
  index("stations_click_count_idx").on(table.clickCount),
  index("stations_provider_votes_idx").on(table.providerVotes),
  index("stations_updated_at_idx").on(table.updatedAt),
  check("stations_latitude_range", sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`),
  check("stations_longitude_range", sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`),
  check("stations_provider_votes_nonnegative", sql`${table.providerVotes} >= 0`),
  check("stations_provider_clicks_nonnegative", sql`${table.providerClicks} >= 0`),
  check("stations_star_count_nonnegative", sql`${table.starCount} >= 0`),
  check("stations_click_count_nonnegative", sql`${table.clickCount} >= 0`)
]);

export const usersFavourites = pgTable("users_favourites", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stationId: uuid("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.stationId] }),
  index("users_favourites_user_id_idx").on(table.userId),
  index("users_favourites_station_id_idx").on(table.stationId)
]);

export const stationClicks = pgTable("station_clicks", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stationId: uuid("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
  clickCount: integer("click_count").notNull().default(0),
  firstClickedAt: timestamp("first_clicked_at", { withTimezone: true }).notNull().defaultNow(),
  lastClickedAt: timestamp("last_clicked_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.stationId] }),
  index("station_clicks_station_id_idx").on(table.stationId),
  check("station_clicks_click_count_positive", sql`${table.clickCount} >= 0`)
]);

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  favourites: many(usersFavourites),
  sessions: many(sessions),
  stationClicks: many(stationClicks)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id]
  })
}));

export const stationsRelations = relations(stations, ({ many }) => ({
  favourites: many(usersFavourites),
  clicks: many(stationClicks)
}));

export const usersFavouritesRelations = relations(usersFavourites, ({ one }) => ({
  user: one(users, {
    fields: [usersFavourites.userId],
    references: [users.id]
  }),
  station: one(stations, {
    fields: [usersFavourites.stationId],
    references: [stations.id]
  })
}));

export const stationClicksRelations = relations(stationClicks, ({ one }) => ({
  user: one(users, {
    fields: [stationClicks.userId],
    references: [users.id]
  }),
  station: one(stations, {
    fields: [stationClicks.stationId],
    references: [stations.id]
  })
}));
