CREATE TABLE radio_station_aliases (
  station_id uuid PRIMARY KEY,
  canonical_id uuid NOT NULL,
  identity_key text NOT NULL,
  stream_key text NOT NULL,
  record jsonb NOT NULL
);
CREATE INDEX radio_alias_canonical_idx ON radio_station_aliases(canonical_id);
CREATE INDEX radio_alias_identity_idx ON radio_station_aliases(identity_key);
CREATE INDEX radio_alias_stream_idx ON radio_station_aliases(stream_key);
ALTER TABLE radio_station_aliases ENABLE ROW LEVEL SECURITY;

-- Account writes and consolidation share a lock so a save cannot reintroduce an alias.
CREATE FUNCTION canonical_radio_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock_shared(72409189);
  NEW.media_item_id := COALESCE((SELECT canonical_id FROM radio_station_aliases WHERE station_id = NEW.media_item_id), NEW.media_item_id);
  RETURN NEW;
END $$;
CREATE TRIGGER canonical_saved_station BEFORE INSERT OR UPDATE ON user_saved_media_items
FOR EACH ROW EXECUTE FUNCTION canonical_radio_reference();
CREATE TRIGGER canonical_folder_station BEFORE INSERT OR UPDATE ON user_favourite_folder_items
FOR EACH ROW EXECUTE FUNCTION canonical_radio_reference();
CREATE TRIGGER canonical_history_station BEFORE INSERT OR UPDATE ON user_playback_history
FOR EACH ROW EXECUTE FUNCTION canonical_radio_reference();
CREATE TRIGGER canonical_click_station BEFORE INSERT OR UPDATE ON user_media_clicks
FOR EACH ROW EXECUTE FUNCTION canonical_radio_reference();

CREATE FUNCTION consolidate_radio_accounts() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(72409189);
  -- Seed missing representatives before moving foreign keys. Preserve user metadata.
  INSERT INTO media_items
  SELECT (jsonb_populate_record(NULL::media_items, to_jsonb(m) || jsonb_build_object(
    'id', a.canonical_id, 'provider_item_id', a.canonical_id::text))).*
  FROM media_items m JOIN radio_station_aliases a ON a.station_id = m.id
  WHERE a.station_id <> a.canonical_id ON CONFLICT DO NOTHING;
  INSERT INTO radio_stations
  SELECT (jsonb_populate_record(NULL::radio_stations, to_jsonb(r) || jsonb_build_object('media_item_id', a.canonical_id))).*
  FROM radio_stations r JOIN radio_station_aliases a ON a.station_id = r.media_item_id
  WHERE a.station_id <> a.canonical_id ON CONFLICT DO NOTHING;

  INSERT INTO user_saved_media_items(user_id, media_item_id, created_at, updated_at)
  SELECT s.user_id, a.canonical_id, min(s.created_at), max(s.updated_at)
  FROM user_saved_media_items s JOIN radio_station_aliases a ON a.station_id = s.media_item_id
  WHERE a.station_id <> a.canonical_id GROUP BY s.user_id, a.canonical_id
  ON CONFLICT(user_id, media_item_id) DO UPDATE SET
    created_at = LEAST(user_saved_media_items.created_at, excluded.created_at),
    updated_at = GREATEST(user_saved_media_items.updated_at, excluded.updated_at);

  INSERT INTO user_favourite_folder_items(folder_id, media_item_id, created_at, updated_at)
  SELECT s.folder_id, a.canonical_id, min(s.created_at), max(s.updated_at)
  FROM user_favourite_folder_items s JOIN radio_station_aliases a ON a.station_id = s.media_item_id
  WHERE a.station_id <> a.canonical_id GROUP BY s.folder_id, a.canonical_id
  ON CONFLICT(folder_id, media_item_id) DO UPDATE SET
    created_at = LEAST(user_favourite_folder_items.created_at, excluded.created_at),
    updated_at = GREATEST(user_favourite_folder_items.updated_at, excluded.updated_at);

  INSERT INTO user_playback_history(user_id, media_item_id, played_on, last_played_at)
  SELECT s.user_id, a.canonical_id, s.played_on, max(s.last_played_at)
  FROM user_playback_history s JOIN radio_station_aliases a ON a.station_id = s.media_item_id
  WHERE a.station_id <> a.canonical_id GROUP BY s.user_id, a.canonical_id, s.played_on
  ON CONFLICT(user_id, media_item_id, played_on) DO UPDATE SET
    last_played_at = GREATEST(user_playback_history.last_played_at, excluded.last_played_at);

  INSERT INTO user_media_clicks(user_id, media_item_id, click_count, last_clicked_at)
  SELECT s.user_id, a.canonical_id, sum(s.click_count)::integer, max(s.last_clicked_at)
  FROM user_media_clicks s JOIN radio_station_aliases a ON a.station_id = s.media_item_id
  WHERE a.station_id <> a.canonical_id GROUP BY s.user_id, a.canonical_id
  ON CONFLICT(user_id, media_item_id) DO UPDATE SET
    click_count = user_media_clicks.click_count + excluded.click_count,
    last_clicked_at = GREATEST(user_media_clicks.last_clicked_at, excluded.last_clicked_at);

  -- Memberships and history are now represented on the survivor; cascading removes only aliases.
  DELETE FROM media_items m USING radio_station_aliases a WHERE m.id = a.station_id AND a.station_id <> a.canonical_id;
  UPDATE media_items m SET
    star_count = (SELECT count(*) FROM user_saved_media_items s WHERE s.media_item_id = m.id),
    click_count = COALESCE((SELECT sum(click_count) FROM user_media_clicks c WHERE c.media_item_id = m.id), 0)
  WHERE m.mode_id = 'radio';
END $$;
