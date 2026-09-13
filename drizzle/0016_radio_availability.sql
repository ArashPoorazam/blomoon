CREATE TABLE radio_curated_stations (
 station_id uuid PRIMARY KEY, country_code text NOT NULL, name_text text NOT NULL, country_text text NOT NULL,
 language_text text NOT NULL, tag_text text NOT NULL, search_text text NOT NULL, votes integer NOT NULL, clicks integer NOT NULL,
 record jsonb NOT NULL, enabled boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX radio_curated_search_idx ON radio_curated_stations USING gin (search_text gin_trgm_ops);
CREATE TABLE radio_stream_sources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), station_id uuid NOT NULL, source_key text NOT NULL UNIQUE,
 origin text NOT NULL CHECK (origin IN ('provider','curated')), provider_id uuid, stream_url text NOT NULL, host text NOT NULL,
 enabled boolean NOT NULL DEFAULT true, last_attempt timestamptz, last_success timestamptz,
 failures integer NOT NULL DEFAULT 0 CHECK (failures >= 0), reason text, next_check timestamptz NOT NULL DEFAULT now(),
 lease_token uuid, lease_until timestamptz, last_played timestamptz, last_requested timestamptz
);
CREATE INDEX radio_source_station_idx ON radio_stream_sources(station_id);
CREATE INDEX radio_source_due_idx ON radio_stream_sources(enabled,next_check);
CREATE INDEX radio_source_host_idx ON radio_stream_sources(host,lease_until);
CREATE TABLE radio_admin_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL, station_id uuid NOT NULL,
 action text NOT NULL, changes jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE radio_health_worker (
 id text PRIMARY KEY, heartbeat timestamptz NOT NULL DEFAULT now(), status text NOT NULL,
 probes integer NOT NULL DEFAULT 0, successes integer NOT NULL DEFAULT 0, bytes text NOT NULL DEFAULT '0'
);
CREATE VIEW radio_directory AS
 SELECT e.station_id,e.country_code,e.name_text,e.country_text,e.language_text,e.tag_text,e.search_text,e.votes,e.clicks,e.record
 FROM radio_catalog_entries e JOIN radio_catalog_generations g ON g.id=e.generation_id AND g.active
 WHERE NOT EXISTS (SELECT 1 FROM radio_curated_stations c WHERE c.station_id=e.station_id)
 UNION ALL
 SELECT station_id,country_code,name_text,country_text,language_text,tag_text,search_text,votes,clicks,record
 FROM radio_curated_stations WHERE enabled;
