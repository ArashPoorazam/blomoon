-- Default folders are provisioned by the application's enabled-mode registry.
DROP TRIGGER users_provision_default_favourite_folder ON users;
DROP FUNCTION provision_default_favourite_folder();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_default_favourite_folder() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.mode_id <> OLD.mode_id THEN
    RAISE EXCEPTION 'favourite folder mode is immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD.is_default AND TG_OP = 'UPDATE' AND (NOT NEW.is_default OR NEW.name <> 'Favourites' OR NEW.user_id <> OLD.user_id) THEN
    RAISE EXCEPTION 'default favourite folder is protected' USING ERRCODE = '23514';
  END IF;
  IF OLD.is_default AND TG_OP = 'DELETE' AND EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id) THEN
    RAISE EXCEPTION 'default favourite folder is protected' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE FUNCTION validate_favourite_folder_item_mode() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM user_favourite_folders f, media_items m
    WHERE f.id = NEW.folder_id AND m.id = NEW.media_item_id AND f.mode_id <> m.mode_id
  ) THEN
    RAISE EXCEPTION 'item mode does not match favourite folder mode' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER user_favourite_folder_items_validate_mode
BEFORE INSERT OR UPDATE OF folder_id, media_item_id ON user_favourite_folder_items
FOR EACH ROW EXECUTE FUNCTION validate_favourite_folder_item_mode();
