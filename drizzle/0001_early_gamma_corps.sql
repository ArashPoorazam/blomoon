CREATE TABLE "pending_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"otp_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_registrations_email_unique" UNIQUE("email"),
	CONSTRAINT "pending_registrations_attempts_nonnegative" CHECK ("pending_registrations"."attempts" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pending_registrations_email_normalized_unique" ON "pending_registrations" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "pending_registrations_expires_at_idx" ON "pending_registrations" USING btree ("expires_at");--> statement-breakpoint
DELETE FROM "users"
WHERE "email_verified" = false
  AND EXISTS (
    SELECT 1
    FROM "accounts"
    WHERE "accounts"."user_id" = "users"."id"
      AND "accounts"."provider_id" = 'credential'
      AND "accounts"."issuer" = 'local:credential'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "accounts"
    WHERE "accounts"."user_id" = "users"."id"
      AND "accounts"."provider_id" <> 'credential'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "users_favourites"
    WHERE "users_favourites"."user_id" = "users"."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "station_clicks"
    WHERE "station_clicks"."user_id" = "users"."id"
  );
