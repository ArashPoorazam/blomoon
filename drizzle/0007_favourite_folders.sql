ALTER TABLE "user_favourite_lists" RENAME TO "user_favourite_folders";
--> statement-breakpoint
ALTER TABLE "user_favourite_list_items" RENAME TO "user_favourite_folder_items";
--> statement-breakpoint
ALTER TABLE "user_favourite_folder_items" RENAME COLUMN "list_id" TO "folder_id";
--> statement-breakpoint
ALTER TABLE "user_favourite_folders" ADD COLUMN "description" text;
--> statement-breakpoint
ALTER TABLE "user_favourite_folders" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_favourite_folders" ADD COLUMN "share_token" text;
--> statement-breakpoint
ALTER TABLE "user_favourite_folders" ADD COLUMN "shared_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "user_favourite_folders" ADD COLUMN "import_source_folder_id" uuid;
--> statement-breakpoint
ALTER TABLE "user_favourite_folders" ADD COLUMN "imported_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "user_favourite_folders"
SET "name" = 'Favourites', "is_default" = true
WHERE lower(btrim("name")) = 'favourites';
--> statement-breakpoint
INSERT INTO "user_favourite_folders" ("user_id", "name", "is_default", "created_at", "updated_at")
SELECT "id", 'Favourites', true, now(), now()
FROM "users"
WHERE NOT EXISTS (
  SELECT 1 FROM "user_favourite_folders"
  WHERE "user_favourite_folders"."user_id" = "users"."id"
    AND "user_favourite_folders"."is_default" = true
);
--> statement-breakpoint
DROP INDEX "user_favourite_lists_user_name_unique";
--> statement-breakpoint
DROP INDEX "user_favourite_lists_user_updated_idx";
--> statement-breakpoint
DROP INDEX "user_favourite_list_items_media_item_id_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "user_favourite_folders_user_name_unique" ON "user_favourite_folders" USING btree ("user_id", lower("name"));
--> statement-breakpoint
CREATE UNIQUE INDEX "user_favourite_folders_one_default_unique" ON "user_favourite_folders" USING btree ("user_id") WHERE "is_default";
--> statement-breakpoint
CREATE UNIQUE INDEX "user_favourite_folders_share_token_unique" ON "user_favourite_folders" USING btree ("share_token");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_favourite_folders_import_source_unique" ON "user_favourite_folders" USING btree ("user_id", "import_source_folder_id") WHERE "import_source_folder_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "user_favourite_folders_user_updated_idx" ON "user_favourite_folders" USING btree ("user_id", "updated_at");
--> statement-breakpoint
CREATE INDEX "user_favourite_folder_items_media_item_id_idx" ON "user_favourite_folder_items" USING btree ("media_item_id");
--> statement-breakpoint
ALTER TABLE "user_favourite_folders" DROP CONSTRAINT "user_favourite_lists_name_length";
--> statement-breakpoint
ALTER TABLE "user_favourite_folders" ADD CONSTRAINT "user_favourite_folders_name_length" CHECK (length(btrim("name")) BETWEEN 1 AND 80);
--> statement-breakpoint
ALTER TABLE "user_favourite_folders" ADD CONSTRAINT "user_favourite_folders_description_length" CHECK ("description" IS NULL OR length("description") <= 240);
--> statement-breakpoint
ALTER TABLE "user_favourite_folders" ADD CONSTRAINT "user_favourite_folders_share_state" CHECK (("share_token" IS NULL) = ("shared_at" IS NULL));
--> statement-breakpoint
ALTER TABLE "user_favourite_folders" ADD CONSTRAINT "user_favourite_folders_import_state" CHECK (("import_source_folder_id" IS NULL) = ("imported_at" IS NULL));
--> statement-breakpoint
CREATE FUNCTION "provision_default_favourite_folder"() RETURNS trigger AS $$
BEGIN
  INSERT INTO "user_favourite_folders" ("user_id", "name", "is_default")
  VALUES (NEW."id", 'Favourites', true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "users_provision_default_favourite_folder"
AFTER INSERT ON "users"
FOR EACH ROW EXECUTE FUNCTION "provision_default_favourite_folder"();
--> statement-breakpoint
CREATE FUNCTION "protect_default_favourite_folder"() RETURNS trigger AS $$
BEGIN
  IF OLD."is_default" AND TG_OP = 'UPDATE' AND (NOT NEW."is_default" OR NEW."name" <> 'Favourites' OR NEW."user_id" <> OLD."user_id") THEN
    RAISE EXCEPTION 'default favourite folder is protected' USING ERRCODE = '23514';
  END IF;
  IF OLD."is_default" AND TG_OP = 'DELETE' AND EXISTS (SELECT 1 FROM "users" WHERE "id" = OLD."user_id") THEN
    RAISE EXCEPTION 'default favourite folder is protected' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "user_favourite_folders_protect_default"
BEFORE UPDATE OR DELETE ON "user_favourite_folders"
FOR EACH ROW EXECUTE FUNCTION "protect_default_favourite_folder"();
