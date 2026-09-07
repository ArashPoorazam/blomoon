import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  foreignKey,
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
import { terraThemeIds } from "../lib/theme/ids";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  selectedTheme: text("selected_theme", { enum: terraThemeIds }).notNull().default("night"),
  firstLoginAt: timestamp("first_login_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  loginCount: integer("login_count").notNull().default(0),
  tipsDismissedAt: timestamp("tips_dismissed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex("users_email_normalized_unique").on(sql`lower(${table.email})`),
  check("users_login_count_nonnegative", sql`${table.loginCount} >= 0`)
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
  index("sessions_user_id_idx").on(table.userId)
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

export const pendingRegistrations = pgTable("pending_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  otpHash: text("otp_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex("pending_registrations_email_normalized_unique").on(sql`lower(${table.email})`),
  index("pending_registrations_expires_at_idx").on(table.expiresAt),
  check("pending_registrations_attempts_nonnegative", sql`${table.attempts} >= 0`)
]);

export const mediaModes = pgTable("media_modes", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const mediaProviders = pgTable("media_providers", {
  id: text("id").primaryKey(),
  modeId: text("mode_id").notNull().references(() => mediaModes.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  url: text("url"),
  attribution: text("attribution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex("media_providers_id_mode_id_unique").on(table.id, table.modeId),
  index("media_providers_mode_id_idx").on(table.modeId)
]);

export const mediaItems = pgTable("media_items", {
  id: uuid("id").primaryKey(),
  modeId: text("mode_id").notNull().references(() => mediaModes.id, { onDelete: "restrict" }),
  providerId: text("provider_id").notNull(),
  providerItemId: text("provider_item_id").notNull(),
  name: text("name").notNull(),
  summary: text("summary").notNull(),
  countryCode: text("country_code").notNull(),
  country: text("country").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  locationPrecision: text("location_precision", { enum: ["station", "country"] }).notNull(),
  sourceUrl: text("source_url"),
  starCount: integer("star_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  providerMetadata: jsonb("provider_metadata").$type<Record<string, string | number | null>>().notNull().default({}),
  providerUpdatedAt: timestamp("provider_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  foreignKey({
    columns: [table.providerId, table.modeId],
    foreignColumns: [mediaProviders.id, mediaProviders.modeId],
    name: "media_items_provider_mode_fk"
  }).onDelete("restrict"),
  uniqueIndex("media_items_provider_item_unique").on(table.providerId, table.providerItemId),
  index("media_items_provider_mode_idx").on(table.providerId, table.modeId),
  index("media_items_mode_country_idx").on(table.modeId, table.countryCode),
  index("media_items_country_code_idx").on(table.countryCode),
  index("media_items_star_count_idx").on(table.starCount),
  index("media_items_click_count_idx").on(table.clickCount),
  index("media_items_updated_at_idx").on(table.updatedAt),
  check("media_items_country_code_format", sql`${table.countryCode} ~ '^[0-9]{3}$' OR ${table.countryCode} LIKE 'X-%'`),
  check("media_items_latitude_range", sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`),
  check("media_items_longitude_range", sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`),
  check("media_items_location_precision_valid", sql`${table.locationPrecision} IN ('station', 'country')`),
  check("media_items_star_count_nonnegative", sql`${table.starCount} >= 0`),
  check("media_items_click_count_nonnegative", sql`${table.clickCount} >= 0`)
]);

export const radioStations = pgTable("radio_stations", {
  mediaItemId: uuid("media_item_id").primaryKey().references(() => mediaItems.id, { onDelete: "cascade" }),
  streamUrl: text("stream_url").notNull(),
  language: text("language"),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  codec: text("codec"),
  bitrate: integer("bitrate"),
  providerVotes: integer("provider_votes").notNull().default(0),
  providerClicks: integer("provider_clicks").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("radio_stations_provider_votes_idx").on(table.providerVotes),
  check("radio_stations_stream_url_http", sql`${table.streamUrl} ~* '^https?://'`),
  check("radio_stations_bitrate_nonnegative", sql`${table.bitrate} IS NULL OR ${table.bitrate} >= 0`),
  check("radio_stations_provider_votes_nonnegative", sql`${table.providerVotes} >= 0`),
  check("radio_stations_provider_clicks_nonnegative", sql`${table.providerClicks} >= 0`)
]);

export const userFavouriteFolders = pgTable("user_favourite_folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  shareToken: text("share_token").unique(),
  sharedAt: timestamp("shared_at", { withTimezone: true }),
  importSourceFolderId: uuid("import_source_folder_id"),
  importedAt: timestamp("imported_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex("user_favourite_folders_user_name_unique").on(table.userId, sql`lower(${table.name})`),
  uniqueIndex("user_favourite_folders_one_default_unique").on(table.userId).where(sql`${table.isDefault}`),
  uniqueIndex("user_favourite_folders_import_source_unique").on(table.userId, table.importSourceFolderId).where(sql`${table.importSourceFolderId} IS NOT NULL`),
  index("user_favourite_folders_user_updated_idx").on(table.userId, table.updatedAt),
  check("user_favourite_folders_name_length", sql`length(btrim(${table.name})) BETWEEN 1 AND 80`),
  check("user_favourite_folders_description_length", sql`${table.description} IS NULL OR length(${table.description}) <= 240`),
  check("user_favourite_folders_share_state", sql`(${table.shareToken} IS NULL) = (${table.sharedAt} IS NULL)`),
  check("user_favourite_folders_import_state", sql`(${table.importSourceFolderId} IS NULL) = (${table.importedAt} IS NULL)`)
]);

export const userSavedMediaItems = pgTable("user_saved_media_items", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediaItemId: uuid("media_item_id").notNull().references(() => mediaItems.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.mediaItemId] }),
  index("user_saved_media_items_user_updated_idx").on(table.userId, table.updatedAt),
  index("user_saved_media_items_media_item_id_idx").on(table.mediaItemId)
]);

export const userFavouriteFolderItems = pgTable("user_favourite_folder_items", {
  folderId: uuid("folder_id").notNull().references(() => userFavouriteFolders.id, { onDelete: "cascade" }),
  mediaItemId: uuid("media_item_id").notNull().references(() => mediaItems.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.folderId, table.mediaItemId] }),
  index("user_favourite_folder_items_media_item_id_idx").on(table.mediaItemId)
]);

export const userMediaClicks = pgTable("user_media_clicks", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediaItemId: uuid("media_item_id").notNull().references(() => mediaItems.id, { onDelete: "cascade" }),
  clickCount: integer("click_count").notNull().default(0),
  firstClickedAt: timestamp("first_clicked_at", { withTimezone: true }).notNull().defaultNow(),
  lastClickedAt: timestamp("last_clicked_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.mediaItemId] }),
  index("user_media_clicks_media_item_id_idx").on(table.mediaItemId),
  check("user_media_clicks_click_count_positive", sql`${table.clickCount} >= 0`)
]);

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  favouriteFolders: many(userFavouriteFolders),
  savedMediaItems: many(userSavedMediaItems),
  sessions: many(sessions),
  mediaClicks: many(userMediaClicks)
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

export const mediaModesRelations = relations(mediaModes, ({ many }) => ({
  items: many(mediaItems),
  providers: many(mediaProviders)
}));

export const mediaProvidersRelations = relations(mediaProviders, ({ many, one }) => ({
  mode: one(mediaModes, {
    fields: [mediaProviders.modeId],
    references: [mediaModes.id]
  }),
  items: many(mediaItems)
}));

export const mediaItemsRelations = relations(mediaItems, ({ many, one }) => ({
  mode: one(mediaModes, {
    fields: [mediaItems.modeId],
    references: [mediaModes.id]
  }),
  provider: one(mediaProviders, {
    fields: [mediaItems.providerId],
    references: [mediaProviders.id]
  }),
  radioStation: one(radioStations),
  favouriteFolderItems: many(userFavouriteFolderItems),
  savedByUsers: many(userSavedMediaItems),
  clicks: many(userMediaClicks)
}));

export const radioStationsRelations = relations(radioStations, ({ one }) => ({
  mediaItem: one(mediaItems, {
    fields: [radioStations.mediaItemId],
    references: [mediaItems.id]
  })
}));

export const userFavouriteFoldersRelations = relations(userFavouriteFolders, ({ many, one }) => ({
  user: one(users, {
    fields: [userFavouriteFolders.userId],
    references: [users.id]
  }),
  items: many(userFavouriteFolderItems)
}));

export const userSavedMediaItemsRelations = relations(userSavedMediaItems, ({ one }) => ({
  user: one(users, {
    fields: [userSavedMediaItems.userId],
    references: [users.id]
  }),
  mediaItem: one(mediaItems, {
    fields: [userSavedMediaItems.mediaItemId],
    references: [mediaItems.id]
  })
}));

export const userFavouriteFolderItemsRelations = relations(userFavouriteFolderItems, ({ one }) => ({
  folder: one(userFavouriteFolders, {
    fields: [userFavouriteFolderItems.folderId],
    references: [userFavouriteFolders.id]
  }),
  mediaItem: one(mediaItems, {
    fields: [userFavouriteFolderItems.mediaItemId],
    references: [mediaItems.id]
  })
}));

export const userMediaClicksRelations = relations(userMediaClicks, ({ one }) => ({
  user: one(users, {
    fields: [userMediaClicks.userId],
    references: [users.id]
  }),
  mediaItem: one(mediaItems, {
    fields: [userMediaClicks.mediaItemId],
    references: [mediaItems.id]
  })
}));
