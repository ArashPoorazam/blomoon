-- Catalog only: this does not register/enable a client mode or approve sources.
INSERT INTO media_modes(id,label) VALUES ('podcasts','Podcasts') ON CONFLICT DO NOTHING;
INSERT INTO media_providers(id,mode_id,name,attribution) VALUES ('podcasts-curated','podcasts','Curated RSS','Attribution supplied per curated feed') ON CONFLICT DO NOTHING;
CREATE TABLE podcast_shows (
  media_item_id uuid PRIMARY KEY REFERENCES media_items(id) ON DELETE RESTRICT,
  description text NOT NULL DEFAULT '', language text, explicit boolean,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE podcast_feeds (
  source_id uuid PRIMARY KEY REFERENCES ingestion_sources(id) ON DELETE RESTRICT,
  show_id uuid NOT NULL UNIQUE REFERENCES podcast_shows(media_item_id) ON DELETE RESTRICT,
  provenance text NOT NULL, attribution text NOT NULL
);
CREATE TABLE podcast_feed_aliases (
  url text PRIMARY KEY, source_id uuid NOT NULL REFERENCES podcast_feeds(source_id) ON DELETE RESTRICT
);
CREATE INDEX podcast_feed_alias_source_idx ON podcast_feed_aliases(source_id);
CREATE TABLE podcast_episodes (
  media_item_id uuid PRIMARY KEY REFERENCES media_items(id) ON DELETE RESTRICT,
  show_id uuid NOT NULL REFERENCES podcast_shows(media_item_id) ON DELETE RESTRICT,
  identity_key text NOT NULL, description text NOT NULL DEFAULT '', published_at timestamptz,
  explicit boolean, duration_seconds integer CONSTRAINT podcast_episode_duration CHECK (duration_seconds >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX podcast_episode_identity_idx ON podcast_episodes(show_id,identity_key);
CREATE INDEX podcast_episode_show_date_idx ON podcast_episodes(show_id,published_at DESC,media_item_id);
CREATE TABLE podcast_enclosures (
  episode_id uuid NOT NULL REFERENCES podcast_episodes(media_item_id) ON DELETE RESTRICT,
  url text NOT NULL, mime text NOT NULL, bytes bigint CONSTRAINT podcast_enclosure_bytes CHECK (bytes >= 0), active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(episode_id,url)
);
--> statement-breakpoint
CREATE FUNCTION require_podcast_kind() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM media_items WHERE id=NEW.media_item_id AND mode_id='podcasts' AND kind=TG_ARGV[0]) THEN
    RAISE EXCEPTION 'podcast domain identity mismatch' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER podcast_show_kind BEFORE INSERT OR UPDATE ON podcast_shows FOR EACH ROW EXECUTE FUNCTION require_podcast_kind('show');
CREATE TRIGGER podcast_episode_kind BEFORE INSERT OR UPDATE ON podcast_episodes FOR EACH ROW EXECUTE FUNCTION require_podcast_kind('episode');
ALTER TABLE podcast_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_feed_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_enclosures ENABLE ROW LEVEL SECURITY;
