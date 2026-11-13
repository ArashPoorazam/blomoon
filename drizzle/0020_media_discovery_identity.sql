-- Additive expansion: existing radio UUIDs, aliases and saved references stay intact.
ALTER TABLE media_items ADD COLUMN kind text NOT NULL DEFAULT 'station';
ALTER TABLE media_items ALTER COLUMN country_code DROP NOT NULL,
  ALTER COLUMN country DROP NOT NULL, ALTER COLUMN latitude DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL, ALTER COLUMN location_precision DROP NOT NULL;
ALTER TABLE media_items DROP CONSTRAINT media_items_location_precision_valid;
ALTER TABLE media_items ADD CONSTRAINT media_items_location_precision_valid CHECK (location_precision IN ('station', 'country', 'verified'));
ALTER TABLE media_items ADD CONSTRAINT media_items_kind_mode CHECK (
  (mode_id = 'radio' AND kind = 'station') OR
  (mode_id = 'podcasts' AND kind IN ('show', 'episode')) OR
  (mode_id = 'tv' AND kind = 'channel') OR
  (mode_id NOT IN ('radio', 'podcasts', 'tv') AND kind IN ('station', 'show', 'episode', 'channel'))) NOT VALID;
ALTER TABLE media_items ADD CONSTRAINT media_items_location_complete CHECK (
  (latitude IS NULL AND longitude IS NULL AND location_precision IS NULL) OR
  (latitude IS NOT NULL AND longitude IS NOT NULL AND location_precision IS NOT NULL)) NOT VALID;
ALTER TABLE media_items ADD CONSTRAINT media_items_radio_location CHECK (
  mode_id <> 'radio' OR (latitude IS NOT NULL AND country_code IS NOT NULL AND country IS NOT NULL AND location_precision IN ('station', 'country'))) NOT VALID;
--> statement-breakpoint
-- Existing rows are radio; the constant default is the staged kind backfill.
ALTER TABLE media_items VALIDATE CONSTRAINT media_items_kind_mode;
ALTER TABLE media_items VALIDATE CONSTRAINT media_items_location_complete;
ALTER TABLE media_items VALIDATE CONSTRAINT media_items_radio_location;
CREATE UNIQUE INDEX media_items_id_mode_kind_unique ON media_items(id, mode_id, kind);
CREATE TABLE media_identity_aliases (
  mode_id text NOT NULL, kind text NOT NULL, provider_id text NOT NULL,
  provider_item_id text NOT NULL, media_item_id uuid NOT NULL,
  PRIMARY KEY (mode_id, kind, provider_id, provider_item_id),
  FOREIGN KEY (media_item_id, mode_id, kind) REFERENCES media_items(id, mode_id, kind) ON DELETE RESTRICT,
  FOREIGN KEY (provider_id, mode_id) REFERENCES media_providers(id, mode_id) ON DELETE RESTRICT
);
CREATE INDEX media_identity_aliases_item_idx ON media_identity_aliases(media_item_id);
--> statement-breakpoint
-- Discovery-only shows cannot be saved/played as episodes. Follows are a separate P08 relation.
CREATE FUNCTION require_playable_media_item() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM media_items WHERE id = NEW.media_item_id AND kind = 'show') THEN
    RAISE EXCEPTION 'show follows are distinct from playable saves and history' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER media_saved_playable BEFORE INSERT OR UPDATE ON user_saved_media_items
  FOR EACH ROW EXECUTE FUNCTION require_playable_media_item();
CREATE TRIGGER media_folder_playable BEFORE INSERT OR UPDATE ON user_favourite_folder_items
  FOR EACH ROW EXECUTE FUNCTION require_playable_media_item();
CREATE TRIGGER media_history_playable BEFORE INSERT OR UPDATE ON user_playback_history
  FOR EACH ROW EXECUTE FUNCTION require_playable_media_item();
CREATE FUNCTION protect_media_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.kind <> OLD.kind OR NEW.mode_id <> OLD.mode_id THEN
    RAISE EXCEPTION 'media kind and mode are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER media_identity_immutable BEFORE UPDATE ON media_items
  FOR EACH ROW EXECUTE FUNCTION protect_media_identity();
--> statement-breakpoint
ALTER TABLE media_identity_aliases ENABLE ROW LEVEL SECURITY;
