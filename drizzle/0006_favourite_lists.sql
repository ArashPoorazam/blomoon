CREATE TABLE "user_favourite_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_favourite_lists_name_length" CHECK (length(btrim("user_favourite_lists"."name")) BETWEEN 1 AND 80)
);
--> statement-breakpoint
CREATE TABLE "user_saved_media_items" (
	"user_id" uuid NOT NULL,
	"media_item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_saved_media_items_user_id_media_item_id_pk" PRIMARY KEY("user_id","media_item_id")
);
--> statement-breakpoint
CREATE TABLE "user_favourite_list_items" (
	"list_id" uuid NOT NULL,
	"media_item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_favourite_list_items_list_id_media_item_id_pk" PRIMARY KEY("list_id","media_item_id")
);
--> statement-breakpoint
ALTER TABLE "user_favourite_lists" ADD CONSTRAINT "user_favourite_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_saved_media_items" ADD CONSTRAINT "user_saved_media_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_saved_media_items" ADD CONSTRAINT "user_saved_media_items_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_favourite_list_items" ADD CONSTRAINT "user_favourite_list_items_list_id_user_favourite_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."user_favourite_lists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_favourite_list_items" ADD CONSTRAINT "user_favourite_list_items_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "user_favourite_lists_user_name_unique" ON "user_favourite_lists" USING btree ("user_id",lower("name"));
--> statement-breakpoint
CREATE INDEX "user_favourite_lists_user_updated_idx" ON "user_favourite_lists" USING btree ("user_id","updated_at");
--> statement-breakpoint
CREATE INDEX "user_saved_media_items_user_updated_idx" ON "user_saved_media_items" USING btree ("user_id","updated_at");
--> statement-breakpoint
CREATE INDEX "user_saved_media_items_media_item_id_idx" ON "user_saved_media_items" USING btree ("media_item_id");
--> statement-breakpoint
CREATE INDEX "user_favourite_list_items_media_item_id_idx" ON "user_favourite_list_items" USING btree ("media_item_id");
--> statement-breakpoint
INSERT INTO "user_favourite_lists" ("user_id", "name", "created_at", "updated_at")
SELECT
	"user_id",
	'Favourites',
	min("created_at"),
	max("updated_at")
FROM "user_favourites"
GROUP BY "user_id";
--> statement-breakpoint
INSERT INTO "user_saved_media_items" ("user_id", "media_item_id", "created_at", "updated_at")
SELECT "user_id", "media_item_id", "created_at", "updated_at"
FROM "user_favourites"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
WITH "default_lists" AS (
	SELECT "id", "user_id"
	FROM "user_favourite_lists"
	WHERE "name" = 'Favourites'
)
INSERT INTO "user_favourite_list_items" ("list_id", "media_item_id", "created_at", "updated_at")
SELECT
	"default_lists"."id",
	"user_favourites"."media_item_id",
	"user_favourites"."created_at",
	"user_favourites"."updated_at"
FROM "user_favourites"
INNER JOIN "default_lists" ON "default_lists"."user_id" = "user_favourites"."user_id"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DROP TABLE "user_favourites";
--> statement-breakpoint
ALTER TABLE "user_favourite_list_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user_favourite_lists" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user_saved_media_items" ENABLE ROW LEVEL SECURITY;
