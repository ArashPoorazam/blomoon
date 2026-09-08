CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE radio_catalog_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz,
  station_count integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX radio_catalog_one_active ON radio_catalog_generations (active) WHERE active;
--> statement-breakpoint
CREATE TABLE radio_catalog_entries (
  generation_id uuid NOT NULL REFERENCES radio_catalog_generations(id) ON DELETE CASCADE,
  station_id uuid NOT NULL, country_code text NOT NULL, name_text text NOT NULL,
  country_text text NOT NULL, language_text text NOT NULL, tag_text text NOT NULL,
  search_text text NOT NULL, votes integer NOT NULL, clicks integer NOT NULL, record jsonb NOT NULL,
  PRIMARY KEY (generation_id, station_id)
);
CREATE INDEX radio_catalog_country_idx ON radio_catalog_entries(generation_id, country_code);
CREATE INDEX radio_catalog_search_idx ON radio_catalog_entries USING gin(search_text gin_trgm_ops);
CREATE INDEX radio_catalog_prefix_idx ON radio_catalog_entries USING gin(to_tsvector('simple', search_text));
CREATE INDEX radio_catalog_votes_idx ON radio_catalog_entries(generation_id, votes DESC);
--> statement-breakpoint
CREATE TABLE radio_recommendation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_key text NOT NULL, profile_key text NOT NULL,
  expires_at timestamptz NOT NULL, points jsonb NOT NULL, source jsonb NOT NULL,
  personalized boolean NOT NULL
);
CREATE INDEX radio_recommendation_expiry_idx ON radio_recommendation_snapshots(expires_at);
CREATE INDEX radio_recommendation_owner_idx ON radio_recommendation_snapshots(owner_key, profile_key);
--> statement-breakpoint
ALTER TABLE radio_catalog_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_catalog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_recommendation_snapshots ENABLE ROW LEVEL SECURITY;
