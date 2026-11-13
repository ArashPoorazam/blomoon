-- Operator-applied once AFTER ingestion-role.sql and migration 0022.
-- Grant this group to a dedicated podcast worker login (not the application login).
CREATE ROLE blomoon_podcast_ingestion NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT blomoon_ingestion TO blomoon_podcast_ingestion;
GRANT UPDATE (interval_seconds) ON ingestion_sources TO blomoon_podcast_ingestion;
GRANT SELECT ON media_items,media_identity_aliases,podcast_shows,podcast_feeds,podcast_feed_aliases,podcast_episodes,podcast_enclosures TO blomoon_podcast_ingestion;
GRANT INSERT ON media_items,media_identity_aliases,podcast_feed_aliases,podcast_episodes,podcast_enclosures TO blomoon_podcast_ingestion;
GRANT UPDATE (name,summary,provider_updated_at,updated_at) ON media_items TO blomoon_podcast_ingestion;
GRANT UPDATE ON podcast_shows,podcast_episodes,podcast_enclosures TO blomoon_podcast_ingestion;
CREATE POLICY podcast_worker_items_read ON media_items FOR SELECT TO blomoon_podcast_ingestion USING (mode_id='podcasts' AND provider_id='podcasts-curated');
CREATE POLICY podcast_worker_items_insert ON media_items FOR INSERT TO blomoon_podcast_ingestion WITH CHECK (mode_id='podcasts' AND provider_id='podcasts-curated' AND kind='episode');
CREATE POLICY podcast_worker_items_update ON media_items FOR UPDATE TO blomoon_podcast_ingestion USING (mode_id='podcasts' AND provider_id='podcasts-curated') WITH CHECK (mode_id='podcasts' AND provider_id='podcasts-curated');
CREATE POLICY podcast_worker_aliases ON media_identity_aliases TO blomoon_podcast_ingestion USING (mode_id='podcasts' AND provider_id='podcasts-curated') WITH CHECK (mode_id='podcasts' AND provider_id='podcasts-curated');
CREATE POLICY podcast_worker_shows ON podcast_shows TO blomoon_podcast_ingestion USING (true) WITH CHECK (true);
CREATE POLICY podcast_worker_feeds ON podcast_feeds FOR SELECT TO blomoon_podcast_ingestion USING (true);
CREATE POLICY podcast_worker_feed_aliases ON podcast_feed_aliases TO blomoon_podcast_ingestion USING (true) WITH CHECK (true);
CREATE POLICY podcast_worker_episodes ON podcast_episodes TO blomoon_podcast_ingestion USING (true) WITH CHECK (true);
CREATE POLICY podcast_worker_enclosures ON podcast_enclosures TO blomoon_podcast_ingestion USING (true) WITH CHECK (true);
