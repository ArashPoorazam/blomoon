import { sql } from 'drizzle-orm';
import { bigint, boolean, check, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { mediaItems } from './schema';
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
