-- Refuse ambiguous legacy folders before changing their schema or contents.
DO $$ BEGIN
  IF EXISTS (
    SELECT i.folder_id FROM user_favourite_folder_items i
    JOIN media_items m ON m.id = i.media_item_id
    GROUP BY i.folder_id HAVING count(DISTINCT m.mode_id) > 1
  ) THEN
    RAISE EXCEPTION 'Mixed-mode favourite folders require explicit migration before assigning modes';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE user_favourite_folders ADD COLUMN mode_id text REFERENCES media_modes(id) ON DELETE RESTRICT;
UPDATE user_favourite_folders f SET mode_id = coalesce((
  SELECT min(m.mode_id) FROM user_favourite_folder_items i
  JOIN media_items m ON m.id = i.media_item_id WHERE i.folder_id = f.id
), 'radio');
ALTER TABLE user_favourite_folders ALTER COLUMN mode_id SET NOT NULL;
--> statement-breakpoint
DROP INDEX user_favourite_folders_user_name_unique;
DROP INDEX user_favourite_folders_one_default_unique;
CREATE UNIQUE INDEX user_favourite_folders_user_name_unique ON user_favourite_folders(user_id, mode_id, lower(name));
CREATE UNIQUE INDEX user_favourite_folders_one_default_unique ON user_favourite_folders(user_id, mode_id) WHERE is_default;
