ALTER TABLE radio_recommendation_snapshots ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
--> statement-breakpoint
UPDATE radio_recommendation_snapshots s SET user_id = u.id FROM users u WHERE s.owner_key = u.id::text;
--> statement-breakpoint
DELETE FROM radio_recommendation_snapshots WHERE owner_key <> 'guest' AND user_id IS NULL;
