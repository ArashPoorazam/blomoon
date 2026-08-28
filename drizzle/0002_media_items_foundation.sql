CREATE TABLE "media_modes" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"mode_id" text NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"attribution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mode_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"provider_item_id" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"country_code" text NOT NULL,
	"country" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"location_precision" text NOT NULL,
	"source_url" text,
	"star_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"provider_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_items_country_code_format" CHECK ("media_items"."country_code" ~ '^[0-9]{3}$' OR "media_items"."country_code" LIKE 'X-%'),
	CONSTRAINT "media_items_latitude_range" CHECK ("media_items"."latitude" >= -90 AND "media_items"."latitude" <= 90),
	CONSTRAINT "media_items_longitude_range" CHECK ("media_items"."longitude" >= -180 AND "media_items"."longitude" <= 180),
	CONSTRAINT "media_items_location_precision_valid" CHECK ("media_items"."location_precision" IN ('station', 'country')),
	CONSTRAINT "media_items_star_count_nonnegative" CHECK ("media_items"."star_count" >= 0),
	CONSTRAINT "media_items_click_count_nonnegative" CHECK ("media_items"."click_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "radio_stations" (
	"media_item_id" uuid PRIMARY KEY NOT NULL,
	"stream_url" text NOT NULL,
	"language" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"codec" text,
	"bitrate" integer,
	"provider_votes" integer DEFAULT 0 NOT NULL,
	"provider_clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "radio_stations_stream_url_http" CHECK ("radio_stations"."stream_url" ~* '^https?://'),
	CONSTRAINT "radio_stations_bitrate_nonnegative" CHECK ("radio_stations"."bitrate" IS NULL OR "radio_stations"."bitrate" >= 0),
	CONSTRAINT "radio_stations_provider_votes_nonnegative" CHECK ("radio_stations"."provider_votes" >= 0),
	CONSTRAINT "radio_stations_provider_clicks_nonnegative" CHECK ("radio_stations"."provider_clicks" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_favourites" (
	"user_id" uuid NOT NULL,
	"media_item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_favourites_user_id_media_item_id_pk" PRIMARY KEY("user_id","media_item_id")
);
--> statement-breakpoint
CREATE TABLE "user_media_clicks" (
	"user_id" uuid NOT NULL,
	"media_item_id" uuid NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"first_clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_media_clicks_user_id_media_item_id_pk" PRIMARY KEY("user_id","media_item_id"),
	CONSTRAINT "user_media_clicks_click_count_positive" CHECK ("user_media_clicks"."click_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "media_providers" ADD CONSTRAINT "media_providers_mode_id_media_modes_id_fk" FOREIGN KEY ("mode_id") REFERENCES "public"."media_modes"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_mode_id_media_modes_id_fk" FOREIGN KEY ("mode_id") REFERENCES "public"."media_modes"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "media_providers_id_mode_id_unique" ON "media_providers" USING btree ("id","mode_id");
--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_provider_mode_fk" FOREIGN KEY ("provider_id","mode_id") REFERENCES "public"."media_providers"("id","mode_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "radio_stations" ADD CONSTRAINT "radio_stations_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_favourites" ADD CONSTRAINT "user_favourites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_favourites" ADD CONSTRAINT "user_favourites_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_media_clicks" ADD CONSTRAINT "user_media_clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_media_clicks" ADD CONSTRAINT "user_media_clicks_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "media_providers_mode_id_idx" ON "media_providers" USING btree ("mode_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "media_items_provider_item_unique" ON "media_items" USING btree ("provider_id","provider_item_id");
--> statement-breakpoint
CREATE INDEX "media_items_mode_country_idx" ON "media_items" USING btree ("mode_id","country_code");
--> statement-breakpoint
CREATE INDEX "media_items_provider_id_idx" ON "media_items" USING btree ("provider_id");
--> statement-breakpoint
CREATE INDEX "media_items_country_code_idx" ON "media_items" USING btree ("country_code");
--> statement-breakpoint
CREATE INDEX "media_items_star_count_idx" ON "media_items" USING btree ("star_count");
--> statement-breakpoint
CREATE INDEX "media_items_click_count_idx" ON "media_items" USING btree ("click_count");
--> statement-breakpoint
CREATE INDEX "media_items_updated_at_idx" ON "media_items" USING btree ("updated_at");
--> statement-breakpoint
CREATE INDEX "radio_stations_provider_votes_idx" ON "radio_stations" USING btree ("provider_votes");
--> statement-breakpoint
CREATE INDEX "user_favourites_user_updated_idx" ON "user_favourites" USING btree ("user_id","updated_at");
--> statement-breakpoint
CREATE INDEX "user_favourites_media_item_id_idx" ON "user_favourites" USING btree ("media_item_id");
--> statement-breakpoint
CREATE INDEX "user_media_clicks_media_item_id_idx" ON "user_media_clicks" USING btree ("media_item_id");
--> statement-breakpoint
INSERT INTO "media_modes" ("id", "label")
VALUES ('radio', 'Radio');
--> statement-breakpoint
INSERT INTO "media_providers" ("id", "mode_id", "name", "url", "attribution")
VALUES (
	'radio-browser',
	'radio',
	'Radio Browser',
	'https://www.radio-browser.info',
	'Radio Browser community database'
);
--> statement-breakpoint
INSERT INTO "media_items" (
	"id",
	"mode_id",
	"provider_id",
	"provider_item_id",
	"name",
	"summary",
	"country_code",
	"country",
	"latitude",
	"longitude",
	"location_precision",
	"source_url",
	"star_count",
	"click_count",
	"provider_metadata",
	"provider_updated_at",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	'radio',
	'radio-browser',
	"provider_station_id"::text,
	"name",
	"summary",
	"country_code",
	"country",
	"latitude",
	"longitude",
	"location_precision",
	"source_url",
	"star_count",
	"click_count",
	"provider_metadata",
	"provider_updated_at",
	"created_at",
	"updated_at"
FROM "stations";
--> statement-breakpoint
INSERT INTO "radio_stations" (
	"media_item_id",
	"stream_url",
	"language",
	"tags",
	"codec",
	"bitrate",
	"provider_votes",
	"provider_clicks",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	"stream_url",
	"language",
	"tags",
	"codec",
	"bitrate",
	"provider_votes",
	"provider_clicks",
	"created_at",
	"updated_at"
FROM "stations";
--> statement-breakpoint
INSERT INTO "user_favourites" ("user_id", "media_item_id", "created_at", "updated_at")
SELECT "user_id", "station_id", "created_at", "updated_at"
FROM "users_favourites";
--> statement-breakpoint
INSERT INTO "user_media_clicks" ("user_id", "media_item_id", "click_count", "first_clicked_at", "last_clicked_at")
SELECT "user_id", "station_id", "click_count", "first_clicked_at", "last_clicked_at"
FROM "station_clicks";
--> statement-breakpoint
DROP TABLE "users_favourites";
--> statement-breakpoint
DROP TABLE "station_clicks";
--> statement-breakpoint
DROP TABLE "stations";
--> statement-breakpoint
DROP INDEX IF EXISTS "sessions_token_idx";
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "media_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "media_modes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "media_providers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pending_registrations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "radio_stations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user_favourites" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user_media_clicks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "verifications" ENABLE ROW LEVEL SECURITY;
