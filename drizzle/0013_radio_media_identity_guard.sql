CREATE FUNCTION canonical_radio_media_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE canonical uuid;
BEGIN
  IF NEW.mode_id = 'radio' THEN
    PERFORM pg_advisory_xact_lock_shared(72409189);
    SELECT canonical_id INTO canonical FROM radio_station_aliases WHERE station_id = NEW.id;
    IF canonical IS NOT NULL THEN
      NEW.id := canonical;
      NEW.provider_item_id := canonical::text;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER canonical_radio_media BEFORE INSERT ON media_items
FOR EACH ROW EXECUTE FUNCTION canonical_radio_media_item();
CREATE TRIGGER canonical_radio_stream BEFORE INSERT ON radio_stations
FOR EACH ROW EXECUTE FUNCTION canonical_radio_reference();
