CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"issuer" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "station_clicks" (
	"user_id" uuid NOT NULL,
	"station_id" uuid NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"first_clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "station_clicks_user_id_station_id_pk" PRIMARY KEY("user_id","station_id"),
	CONSTRAINT "station_clicks_click_count_positive" CHECK ("station_clicks"."click_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider_station_id" uuid NOT NULL,
	"provider_name" text DEFAULT 'Radio Browser' NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"country_code" text NOT NULL,
	"country" text NOT NULL,
	"language" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"codec" text,
	"bitrate" integer,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"location_precision" text NOT NULL,
	"stream_url" text NOT NULL,
	"source_url" text,
	"provider_votes" integer DEFAULT 0 NOT NULL,
	"provider_clicks" integer DEFAULT 0 NOT NULL,
	"star_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"provider_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stations_provider_station_id_unique" UNIQUE("provider_station_id"),
	CONSTRAINT "stations_latitude_range" CHECK ("stations"."latitude" >= -90 AND "stations"."latitude" <= 90),
	CONSTRAINT "stations_longitude_range" CHECK ("stations"."longitude" >= -180 AND "stations"."longitude" <= 180),
	CONSTRAINT "stations_provider_votes_nonnegative" CHECK ("stations"."provider_votes" >= 0),
	CONSTRAINT "stations_provider_clicks_nonnegative" CHECK ("stations"."provider_clicks" >= 0),
	CONSTRAINT "stations_star_count_nonnegative" CHECK ("stations"."star_count" >= 0),
	CONSTRAINT "stations_click_count_nonnegative" CHECK ("stations"."click_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"selected_theme" text DEFAULT 'night' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users_favourites" (
	"user_id" uuid NOT NULL,
	"station_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_favourites_user_id_station_id_pk" PRIMARY KEY("user_id","station_id")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_clicks" ADD CONSTRAINT "station_clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_clicks" ADD CONSTRAINT "station_clicks_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_favourites" ADD CONSTRAINT "users_favourites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_favourites" ADD CONSTRAINT "users_favourites_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_issuer_account_id_unique" ON "accounts" USING btree ("issuer","account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "accounts_provider_id_idx" ON "accounts" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_token_idx" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "station_clicks_station_id_idx" ON "station_clicks" USING btree ("station_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stations_provider_station_id_unique" ON "stations" USING btree ("provider_station_id");--> statement-breakpoint
CREATE INDEX "stations_country_code_idx" ON "stations" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "stations_star_count_idx" ON "stations" USING btree ("star_count");--> statement-breakpoint
CREATE INDEX "stations_click_count_idx" ON "stations" USING btree ("click_count");--> statement-breakpoint
CREATE INDEX "stations_provider_votes_idx" ON "stations" USING btree ("provider_votes");--> statement-breakpoint
CREATE INDEX "stations_updated_at_idx" ON "stations" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_normalized_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_favourites_user_id_idx" ON "users_favourites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_favourites_station_id_idx" ON "users_favourites" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");