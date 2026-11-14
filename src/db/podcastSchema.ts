import { sql } from 'drizzle-orm';
import { bigint, boolean, check, doublePrecision, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { mediaItems, users } from './schema';
import { ingestionSources } from './ingestionSchema';
const time = (name: string) => timestamp(name, { withTimezone: true });
export const podcastShows = pgTable('podcast_shows', {
  mediaItemId: uuid('media_item_id').primaryKey().references(() => mediaItems.id, { onDelete: 'restrict' }),
  description: text('description').notNull().default(''), language: text('language'), explicit: boolean('explicit'), updatedAt: time('updated_at').notNull().defaultNow(),
}).enableRLS();
export const podcastFeeds = pgTable('podcast_feeds', {
  sourceId: uuid('source_id').primaryKey().references(() => ingestionSources.id, { onDelete: 'restrict' }),
  showId: uuid('show_id').notNull().unique().references(() => podcastShows.mediaItemId, { onDelete: 'restrict' }),
  provenance: text('provenance').notNull(), attribution: text('attribution').notNull(),
}).enableRLS();
export const podcastFeedAliases = pgTable('podcast_feed_aliases', {
  url: text('url').primaryKey(), sourceId: uuid('source_id').notNull().references(() => podcastFeeds.sourceId, { onDelete: 'restrict' }),
}, t => [index('podcast_feed_alias_source_idx').on(t.sourceId)]).enableRLS();
export const podcastEpisodes = pgTable('podcast_episodes', {
  mediaItemId: uuid('media_item_id').primaryKey().references(() => mediaItems.id, { onDelete: 'restrict' }),
  showId: uuid('show_id').notNull().references(() => podcastShows.mediaItemId, { onDelete: 'restrict' }), identityKey: text('identity_key').notNull(),
  description: text('description').notNull().default(''), publishedAt: time('published_at'), explicit: boolean('explicit'), durationSeconds: integer('duration_seconds'), updatedAt: time('updated_at').notNull().defaultNow(),
}, t => [uniqueIndex('podcast_episode_identity_idx').on(t.showId,t.identityKey), index('podcast_episode_show_date_idx').on(t.showId,t.publishedAt.desc(),t.mediaItemId),check('podcast_episode_duration',sql`${t.durationSeconds} >= 0`)]).enableRLS();
export const podcastEnclosures = pgTable('podcast_enclosures', {
  episodeId: uuid('episode_id').notNull().references(() => podcastEpisodes.mediaItemId, { onDelete: 'restrict' }), url: text('url').notNull(), mime: text('mime').notNull(), bytes: bigint('bytes',{mode:'number'}), active: boolean('active').notNull().default(true), updatedAt: time('updated_at').notNull().defaultNow(),
}, t => [primaryKey({columns:[t.episodeId,t.url]}),check('podcast_enclosure_bytes',sql`${t.bytes} >= 0`)]).enableRLS();

export const podcastFollows = pgTable('podcast_follows', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  showId: uuid('show_id').notNull().references(() => podcastShows.mediaItemId, { onDelete: 'restrict' }),
  createdAt: time('created_at').notNull().defaultNow(),
}, t => [primaryKey({columns:[t.userId,t.showId]}), index('podcast_follows_show_idx').on(t.showId), index('podcast_follows_recent_idx').on(t.userId,t.createdAt.desc(),t.showId)]).enableRLS();
export const podcastSaves = pgTable('podcast_saves', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  episodeId: uuid('episode_id').notNull().references(() => podcastEpisodes.mediaItemId, { onDelete: 'restrict' }),
  createdAt: time('created_at').notNull().defaultNow(),
}, t => [primaryKey({columns:[t.userId,t.episodeId]}), index('podcast_saves_episode_idx').on(t.episodeId), index('podcast_saves_recent_idx').on(t.userId,t.createdAt.desc(),t.episodeId)]).enableRLS();
export const podcastListening = pgTable('podcast_listening', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  episodeId: uuid('episode_id').notNull().references(() => podcastEpisodes.mediaItemId, { onDelete: 'restrict' }),
  version: integer('version').notNull().default(0), sessionId: uuid('session_id'), sequence: integer('sequence').notNull().default(0),
  positionSeconds: doublePrecision('position_seconds').notNull().default(0), completed: boolean('completed').notNull().default(false),
  updatedAt: time('updated_at').notNull().defaultNow(),
}, t => [primaryKey({columns:[t.userId,t.episodeId]}), index('podcast_listening_episode_idx').on(t.episodeId),
  index('podcast_listening_recent_idx').on(t.userId,t.updatedAt.desc(),t.episodeId),
  check('podcast_listening_version_check',sql`${t.version} >= 0`),check('podcast_listening_sequence_check',sql`${t.sequence} >= 0`),
  check('podcast_listening_position_seconds_check',sql`${t.positionSeconds} >= 0 and ${t.positionSeconds} <= 604800`),
]).enableRLS();
